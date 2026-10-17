import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const script = fileURLToPath(new URL('../scripts/demo.ts', import.meta.url));

test('CLI accepts user dimensions and writes matching STL, metadata and hash', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'his-ring-'));
  try {
    const result = spawnSync(process.execPath, [script, '160', '140', '10', dir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const files = await readdir(dir);
    const bytes = await readFile(join(dir, files.find(f => f.endsWith('.stl'))!));
    const report = JSON.parse(await readFile(join(dir, files.find(f => f.endsWith('.validation.json'))!), 'utf8'));
    assert.equal(report.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.deepEqual(report.parameters, { outerDiameterMm: 160, innerDiameterMm: 140, thicknessMm: 10 });
    const mesh = new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    mesh.computeBoundingBox();
    assert.deepEqual(mesh.boundingBox!.min.toArray(), [-80, -80, 0]);
    assert.deepEqual(mesh.boundingBox!.max.toArray(), [80, 80, 10]);
    mesh.dispose();
    const threeMf = await readFile(join(dir, files.find(f => f.endsWith('.3mf'))!));
    const project = JSON.parse(await readFile(join(dir, files.find(f => f.endsWith('.his-ring.json'))!), 'utf8'));
    const stlReport = JSON.parse(await readFile(join(dir, files.find(f => f.endsWith('.stl.report.json'))!), 'utf8'));
    const threeMfReport = JSON.parse(await readFile(join(dir, files.find(f => f.endsWith('.3mf.report.json'))!), 'utf8'));
    assert.deepEqual(project.dimensions, { outerDiameterMm: 160, innerDiameterMm: 140, thicknessMm: 10 });
    assert.equal(project.provenance.origin, 'user-entered');
    assert.equal(stlReport.sha256, createHash('sha256').update(bytes).digest('hex'));
    assert.equal(threeMfReport.sha256, createHash('sha256').update(threeMf).digest('hex'));
    assert.equal(threeMfReport.format, '3mf');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI rejects invalid dimensions without creating an export', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'his-ring-'));
  try {
    const result = spawnSync(process.execPath, [script, '100', '110', '10', dir], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.deepEqual(await readdir(dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
