import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlateArtifact, plateHoles, validatePlateDimensions } from '../src/plateGeometry.ts';
import { segmentCount } from '../src/geometry.ts';

const example = {
  outerDiameterMm: 200, innerDiameterMm: 120, thicknessMm: 6,
  speaker: { count: 4, pitchDiameterMm: 150, holeDiameterMm: 4, rotationDeg: 0 },
  vehicle: { count: 4, pitchDiameterMm: 180, holeDiameterMm: 5, rotationDeg: 45 },
};

test('patterns use the specified center diameter and independent rotation', () => {
  const holes = plateHoles(example);
  assert.equal(holes.length, 8);
  assert.ok(Math.abs(holes[0].x - 75) < 1e-9);
  assert.ok(Math.abs(holes[4].x - 90 / Math.sqrt(2)) < 1e-9);
  assert.ok(Math.abs(holes[4].y - 90 / Math.sqrt(2)) < 1e-9);
});

test('rejects holes crossing edges, other holes, and invalid thickness', () => {
  assert.throws(() => validatePlateDimensions({ ...example, speaker: { ...example.speaker, pitchDiameterMm: 120 } }), /opening/i);
  assert.throws(() => validatePlateDimensions({ ...example, speaker: { ...example.speaker, pitchDiameterMm: 200 } }), /edge/i);
  assert.throws(() => validatePlateDimensions({ ...example, vehicle: { ...example.speaker } }), /overlap/i);
  assert.throws(() => validatePlateDimensions({ ...example, thicknessMm: 2.9 }), /thickness/i);
  assert.throws(() => validatePlateDimensions({ ...example, speaker: { ...example.speaker, count: 4.5 } }), /number of holes/i);
  assert.throws(() => validatePlateDimensions({ ...example, outerDiameterMm: NaN }), /valid number/i);
});

test('generated plate and re-read STL are closed, connected, and contain every hole', () => {
  const result = createPlateArtifact(example);
  assert.equal(result.report.holeCount, 8);
  assert.equal(result.report.boundaryEdges, 0);
  assert.equal(result.report.components, 1);
  assert.equal(result.report.eulerCharacteristic, -16);
  assert.ok(result.bytes.length > 84);
  const n = segmentCount(example);
  const ringArea = n * Math.sin(2 * Math.PI / n) / 2 * ((example.outerDiameterMm / 2) ** 2 - (example.innerDiameterMm / 2) ** 2);
  const holeArea = 32 * Math.sin(2 * Math.PI / 32) / 2 * (4 * (4 / 2) ** 2 + 4 * (5 / 2) ** 2);
  assert.ok(Math.abs(result.report.volumeMm3 - (ringArea - holeArea) * example.thicknessMm) < 0.1);
});
