import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measurePhotoDistance } from '../src/photoMeasurement.ts';
import * as photoMeasurement from '../src/photoMeasurement.ts';

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

test('reported range records its limited scope and configured image-pixel allowance', () => {
  const baseline = measurePhotoDistance({ ...points, referenceMm: 100 });
  const wider = measurePhotoDistance({ ...points, referenceMm: 100, endpointUncertaintyPx: 10 });
  assert.equal(baseline.endpointUncertaintyPx, 2);
  assert.equal(wider.endpointUncertaintyPx, 10);
  assert.equal(wider.uncertaintyScope, 'selection-and-reference-only');
  assert.equal(wider.estimateMm, baseline.estimateMm);
  assert.ok(wider.lowerMm < baseline.lowerMm);
  assert.ok(wider.upperMm > baseline.upperMm);
});

test('rejects invalid or unresolved endpoint allowances instead of a misleading range', () => {
  for (const endpointUncertaintyPx of [NaN, Infinity, -1, 250]) {
    assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100, endpointUncertaintyPx }), /endpoint|landmark/i);
  }
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: Number.MIN_VALUE, target: [{ x: 0, y: 0 }, { x: 20, y: 0 }] }), /numeric range/i);
});

test('nonfinite landmark distances cannot produce a zero dimension', () => {
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100,
    reference: [{ x: 0, y: 0 }, { x: 1.7e308, y: 1.7e308 }] }), /landmark|numeric range/i);
});


test('display-pixel allowance scales conservatively into original-image coordinates', () => {
  assert.equal(typeof photoMeasurement.imageEndpointUncertaintyPx, 'function');
  const convert = photoMeasurement.imageEndpointUncertaintyPx;
  assert.equal(convert(2, { width: 4000, height: 3000 }, { width: 560, height: 420 }), 100 / 7);
  assert.equal(convert(2, { width: 4000, height: 3000 }, { width: 4000, height: 3000 }), 2);
  assert.equal(convert(2, { width: 1000, height: 500 }, { width: 500, height: 200 }), 5);
  for (const allowance of [0, -1, NaN, Infinity]) {
    assert.throws(() => convert(allowance, { width: 4000, height: 3000 }, { width: 560, height: 420 }), /allowance/i);
  }
  assert.throws(() => convert(2, { width: 4000, height: 3000 }, { width: 0, height: 420 }), /size/i);
});

test('large original images do not make short displayed landmark spans usable', () => {
  const endpointUncertaintyPx = photoMeasurement.imageEndpointUncertaintyPx(2,
    { width: 4000, height: 3000 }, { width: 560, height: 420 });
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100, reference: [{ x: 0, y: 0 }, { x: 200, y: 0 }], endpointUncertaintyPx }), /reference landmarks/i);
  assert.throws(() => measurePhotoDistance({ ...points, referenceMm: 100,
    reference: [{ x: 0, y: 0 }, { x: 1000, y: 0 }], target: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    endpointUncertaintyPx }), /target landmarks/i);
});
