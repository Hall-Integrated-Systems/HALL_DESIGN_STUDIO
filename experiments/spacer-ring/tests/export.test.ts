import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { createArtifact } from '../src/export.ts';
import { generateRing } from '../src/geometry.ts';
import { readBinaryStl, validateRing } from '../src/validation.ts';

const d = { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 };

test('closed oriented single ring, bore preserved, positive expected volume', () => {
  const report = validateRing(generateRing(d), d);
  assert.equal(report.boundaryEdges, 0);
  assert.equal(report.nonManifoldEdges, 0);
  assert.equal(report.components, 1);
  assert.equal(report.eulerCharacteristic, 0); // One through-hole.
  assert.ok(report.volumeMm3 > 107000 && report.volumeMm3 < 107207);
  assert.ok(report.maxChordErrorMm <= 0.02);
});

test('opening report measures the actual exported polygon flats', () => {
  const { bytes, report } = createArtifact(d);
  const mesh = readBinaryStl(bytes);
  const bore = mesh.vertices.filter(([x, y, z]) => z === 0 && Math.hypot(x, y) < 80).sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  const measured = Math.min(...bore.map((a, i) => {
    const b = bore[(i + 1) % bore.length];
    return 2 * Math.abs(a[0] * b[1] - a[1] * b[0]) / Math.hypot(a[0] - b[0], a[1] - b[1]);
  }));
  assert.ok(Math.abs(report.roundTrip.minOpeningAcrossFlatsMm - measured) < 1e-10);
});

test('binary STL can be independently loaded at exact millimeter scale', () => {
  const { bytes, report } = createArtifact(d);
  assert.ok(bytes.length > 84);
  const geometry = new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  geometry.computeBoundingBox();
  assert.deepEqual(geometry.boundingBox!.min.toArray(), [-90, -90, 0]);
  assert.deepEqual(geometry.boundingBox!.max.toArray(), [90, 90, 12]);
  assert.equal(bytes.length, 84 + 50 * geometry.attributes.position.count / 3);
  assert.equal(report.units, 'mm');
  assert.equal(report.stlValidated, true);
  assert.equal(report.roundTrip.triangles, geometry.attributes.position.count / 3);
  geometry.dispose();
});

test('export is deterministic for the same dimensions', () => {
  const a = createArtifact(d), b = createArtifact(d);
  assert.ok(a.bytes.length > 84);
  assert.deepEqual(a.bytes, b.bytes);
});

test('detects missing, reversed, duplicate and degenerate faces', () => {
  for (const mutate of [
    (m: ReturnType<typeof generateRing>) => m.triangles.pop(),
    (m: ReturnType<typeof generateRing>) => m.triangles[0].reverse(),
    (m: ReturnType<typeof generateRing>) => m.triangles.push([...m.triangles[0]]),
    (m: ReturnType<typeof generateRing>) => { m.triangles[0][1] = m.triangles[0][0]; },
    (m: ReturnType<typeof generateRing>) => { m.vertices[0][0] = NaN; },
  ]) { const mesh = generateRing(d); mutate(mesh); assert.throws(() => validateRing(mesh, d)); }
});

test('detects scale changes, translations and wrong bore size', () => {
  for (const factor of [0.001, 25.4, 1000]) {
    const mesh = generateRing(d);
    mesh.vertices = mesh.vertices.map(v => v.map(x => x * factor) as [number, number, number]);
    assert.throws(() => validateRing(mesh, d));
  }
  const shifted = generateRing(d);
  shifted.vertices.forEach(v => v[2] += 1);
  assert.throws(() => validateRing(shifted, d));
  assert.throws(() => validateRing(generateRing({ ...d, innerDiameterMm: 144 }), d));
});

test('rejects truncated, trailing, non-finite and corrupted STL records', () => {
  const { bytes } = createArtifact(d);
  assert.throws(() => readBinaryStl(bytes.slice(0, -1)));
  const extra = new Uint8Array(bytes.length + 1); extra.set(bytes);
  assert.throws(() => readBinaryStl(extra));
  const corrupt = bytes.slice();
  if (corrupt.length > 100) new DataView(corrupt.buffer).setFloat32(96, NaN, true);
  assert.throws(() => readBinaryStl(corrupt));
  const normal = bytes.slice();
  if (normal.length > 100) new DataView(normal.buffer).setFloat32(84, 0, true);
  assert.throws(() => readBinaryStl(normal));
});

test('small, decimal, thin-wall and maximum-envelope examples round-trip', () => {
  for (const dims of [
    { outerDiameterMm: 2, innerDiameterMm: 1, thicknessMm: 0.2 },
    { outerDiameterMm: 165.5, innerDiameterMm: 142.3, thicknessMm: 8.7 },
    { outerDiameterMm: 180, innerDiameterMm: 179.6, thicknessMm: 12 },
    { outerDiameterMm: 1000, innerDiameterMm: 999.6, thicknessMm: 250 },
    { outerDiameterMm: 1000, innerDiameterMm: 1, thicknessMm: 0.2 },
  ]) assert.equal(createArtifact(dims).report.stlValidated, true);
});
