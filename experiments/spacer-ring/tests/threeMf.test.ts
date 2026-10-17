import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { createArtifact } from '../src/export.ts';
import { createThreeMfArtifact } from '../src/threeMf.ts';
import { encodeZip } from '../src/zip.ts';
import type { RingDimensions } from '../src/geometry.ts';

const inspector = fileURLToPath(new URL('../scripts/inspect_3mf.py', import.meta.url));
const demo: RingDimensions = { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 };

function pythonCommand(): [string, string[]] {
  const choices: [string, string[]][] = process.env.PYTHON ? [[process.env.PYTHON, []]] : [['python', []], ['python3', []], ['py', ['-3']]];
  for (const [command, prefix] of choices) {
    if (spawnSync(command, [...prefix, '--version'], { encoding: 'utf8' }).status === 0) return [command, prefix];
  }
  throw new Error('Python 3 is required for independent 3MF inspection; set PYTHON to its executable.');
}

async function inspect(bytes: Uint8Array, stl: Uint8Array, d: RingDimensions) {
  const dir = await mkdtemp(join(tmpdir(), 'his-3mf-'));
  try {
    const file = join(dir, 'ring.3mf'), stlFile = join(dir, 'ring.stl');
    await writeFile(file, bytes); await writeFile(stlFile, stl);
    const [command, prefix] = pythonCommand();
    return spawnSync(command, [...prefix, inspector, file, stlFile, String(d.outerDiameterMm), String(d.innerDiameterMm), String(d.thicknessMm)], { encoding: 'utf8' });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

function changedModel(bytes: Uint8Array, edit: (xml: string) => string): Uint8Array {
  const files = unzipSync(bytes);
  const model = new TextDecoder().decode(files['3D/3dmodel.model']);
  files['3D/3dmodel.model'] = new TextEncoder().encode(edit(model));
  return encodeZip(files);
}

test('3MF package is deterministic and independently matches the STL triangle stream', async () => {
  for (const dimensions of [demo,
    { outerDiameterMm: 165.5, innerDiameterMm: 142.3, thicknessMm: 8.7 },
    { outerDiameterMm: 2, innerDiameterMm: 1, thicknessMm: 0.2 },
    { outerDiameterMm: 1000, innerDiameterMm: 999.6, thicknessMm: 250 },
  ]) {
    const artifact = createArtifact(dimensions);
    const one = createThreeMfArtifact(artifact, 'A&B <demo> "ring"');
    const two = createThreeMfArtifact(artifact, 'A&B <demo> "ring"');
    assert.deepEqual(one.bytes, two.bytes);
    const result = await inspect(one.bytes, artifact.bytes, dimensions);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.units, 'millimeter');
    assert.equal(report.objects, 1);
    assert.equal(report.build_items, 1);
    assert.equal(report.triangles, artifact.report.roundTrip.triangles);
    assert.equal(report.title, 'A&B <demo> "ring"');
    assert.equal(report.cross_format_triangle_match, 'pass');
    assert.equal(report.central_opening, 'pass');
  }
});

test('3MF writer rechecks mutable mesh and STL bytes before serialization', () => {
  const open = createArtifact(demo); open.mesh.triangles.pop();
  assert.throws(() => createThreeMfArtifact(open, 'Open'), /triangle|mesh|ring/i);
  const reversed = createArtifact(demo); reversed.mesh.triangles[0].reverse();
  assert.throws(() => createThreeMfArtifact(reversed, 'Reversed'), /wound|volume|mesh|ring/i);
  const mismatched = createArtifact(demo); mismatched.bytes[100] ^= 1;
  assert.throws(() => createThreeMfArtifact(mismatched, 'Mismatch'));
});

test('independent reader rejects broken package links, units and mesh references', async () => {
  const artifact = createArtifact(demo);
  const valid = createThreeMfArtifact(artifact, 'Ring').bytes;
  const relFiles = unzipSync(valid);
  relFiles['_rels/.rels'] = new TextEncoder().encode(new TextDecoder().decode(relFiles['_rels/.rels']).replace('/3D/3dmodel.model', '/3D/missing.model'));
  const brokenTarget = encodeZip(relFiles);
  const externalFiles = unzipSync(valid);
  externalFiles['_rels/.rels'] = new TextEncoder().encode(new TextDecoder().decode(externalFiles['_rels/.rels']).replace('Target="/3D/3dmodel.model"', 'Target="https://example.invalid/model" TargetMode="External"'));
  const external = encodeZip(externalFiles);
  const inch = changedModel(valid, xml => xml.replace('unit="millimeter"', 'unit="inch"'));
  const badIndex = changedModel(valid, xml => xml.replace(/<triangle v1="\d+"/, '<triangle v1="999999"'));
  const missingFace = changedModel(valid, xml => xml.replace(/<triangle v1="\d+" v2="\d+" v3="\d+"\/>/, ''));
  const reversedFace = changedModel(valid, xml => xml.replace(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/, '<triangle v1="$1" v2="$3" v3="$2"/>'));
  for (const bytes of [brokenTarget, external, inch, badIndex, missingFace, reversedFace]) {
    const result = await inspect(bytes, artifact.bytes, demo);
    assert.notEqual(result.status, 0, 'Corrupt 3MF unexpectedly passed');
    assert.match(result.stderr, /error|invalid|missing|unit|triangle|relationship|mesh|winding/i);
  }
});

test('independent reader rejects extra model structure and noninteger object IDs', async () => {
  const artifact = createArtifact(demo);
  const valid = createThreeMfArtifact(artifact, 'Ring').bytes;
  const corrupt = [
    changedModel(valid, xml => xml.replace('</model>', '<build><item objectid="999" transform="2 0 0 0 2 0 0 0 2 0 0 0"/></build></model>')),
    changedModel(valid, xml => xml.replace('</model>', '<resources><object id="999" type="model"/></resources></model>')),
    changedModel(valid, xml => xml.replace('</object>', '<mesh/></object>')),
    changedModel(valid, xml => xml.replace('</model>', '<components/></model>')),
    changedModel(valid, xml => xml.replace('id="1" type="model"', 'id="bad" type="model"').replace('objectid="1"', 'objectid="bad"')),
    changedModel(valid, xml => xml.replace('id="1" type="model"', 'id="0" type="model"').replace('objectid="1"', 'objectid="0"')),
  ];
  for (const bytes of corrupt) {
    const result = await inspect(bytes, artifact.bytes, demo);
    assert.notEqual(result.status, 0, 'Malformed model unexpectedly passed independent inspection');
  }
});

test('independent reader rejects duplicate parts and packages above the size cap', async () => {
  const artifact = createArtifact(demo);
  const valid = createThreeMfArtifact(artifact, 'Ring').bytes;
  const oversized = new Uint8Array(8 * 1024 * 1024 + 1); oversized.set(valid);
  assert.notEqual((await inspect(oversized, artifact.bytes, demo)).status, 0);
  const dir = await mkdtemp(join(tmpdir(), 'his-3mf-duplicate-'));
  try {
    const file = join(dir, 'duplicate.3mf'), stlFile = join(dir, 'ring.stl');
    await writeFile(file, valid); await writeFile(stlFile, artifact.bytes);
    const [command, prefix] = pythonCommand();
    const append = spawnSync(command, [...prefix, '-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1], "a"); z.writestr("3D/3dmodel.model", b"duplicate"); z.close()', file], { encoding: 'utf8' });
    assert.equal(append.status, 0, append.stderr);
    assert.ok((await readFile(file)).length > valid.length);
    const result = spawnSync(command, [...prefix, inspector, file, stlFile, '180', '145', '12'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate/i);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
