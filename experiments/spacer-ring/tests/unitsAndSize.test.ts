import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fromMillimeters, toMillimeters, formatMeasurement, ringBuildSize } from '../src/unitsAndSize.ts';

test('measurement conversions preserve the physical size', () => {
  assert.equal(toMillimeters(10, 'in'), 254);
  assert.equal(toMillimeters(25.4, 'cm'), 254);
  assert.equal(fromMillimeters(254, 'in'), 10);
  assert.equal(fromMillimeters(254, 'cm'), 25.4);
  assert.equal(formatMeasurement(25.4, 'in'), '1');
  assert.equal(formatMeasurement(180, 'mm'), '180');
  assert.equal(formatMeasurement(180, 'in'), '7.086614');
});

test('flat ring size uses the Plus5 X, Y and Z envelope without claiming print success', () => {
  assert.equal(ringBuildSize({outerDiameterMm: 320, innerDiameterMm: 300, thicknessMm: 6}), 'within');
  assert.equal(ringBuildSize({outerDiameterMm: 320.01, innerDiameterMm: 300, thicknessMm: 6}), 'oversize');
  assert.equal(ringBuildSize({outerDiameterMm: 200, innerDiameterMm: 100, thicknessMm: 300}), 'within');
  assert.equal(ringBuildSize({outerDiameterMm: 200, innerDiameterMm: 100, thicknessMm: 300.01}), 'oversize');
  assert.equal(ringBuildSize({outerDiameterMm: NaN, innerDiameterMm: 100, thicknessMm: 6}), 'unknown');
});
