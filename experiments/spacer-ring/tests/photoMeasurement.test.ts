import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measurePhotoDistance } from '../src/photoMeasurement.ts';

const points = {
  reference: [{ x: 0, y: 0 }, { x: 500, y: 0 }] as const,
  target: [{ x: 0, y: 100 }, { x: 750, y: 100 }] as const,
};

test('a known same-plane distance scales a manually selected target', () => {
  const result = measurePhotoDistance({ ...points, referenceMm: 100 });
  assert.equal(result.estimateMm, 150);
  assert.equal(result.referencePixels, 500);
  assert.equal(result.targetPixels, 750);
  assert.ok(Math.abs(result.lowerMm - 148.015873015873) < 1e-9);
  assert.ok(Math.abs(result.upperMm - 152.016129032258) < 1e-9);
  assert.equal(result.includesReferenceUncertainty, false);
});

test('entered reference uncertainty widens the reported selection range', () => {
  const result = measurePhotoDistance({ ...points, referenceMm: 100, referenceUncertaintyMm: 1 });
  assert.ok(Math.abs(result.lowerMm - 146.535714285714) < 1e-9);
  assert.ok(Math.abs(result.upperMm - 153.536290322581) < 1e-9);
  assert.equal(result.includesReferenceUncertainty, true);
});

test('invalid or very short landmark pairs cannot become dimensions', () => {
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 0 }), /reference/i);
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100, referenceUncertaintyMm: 100 }), /uncertainty/i);
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100, target: [{ x: 0, y: 0 }, { x: 4, y: 0 }] }), /target/i);
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100, reference: [{ x: 0, y: 0 }, { x: 20, y: 0 }] }), /reference/i);
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100, target: [{ x: NaN, y: 0 }, { x: 750, y: 0 }] }), /landmark/i);
});
