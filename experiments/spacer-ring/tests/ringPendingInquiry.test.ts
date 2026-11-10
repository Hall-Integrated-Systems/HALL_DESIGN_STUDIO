import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPendingRingInquiry, buildReviewedRingInquiry } from '../src/ringPendingInquiry.ts';

test('an unfinished ring inquiry keeps blank dimensions unprovided and marks working values unconfirmed', () => {
  const summary = buildPendingRingInquiry({
    inputs: { outerDiameterMm: '180.25', innerDiameterMm: '', thicknessMm: '12.699999999999999' },
    ringUse: 'speaker', origin: 'user-entered', photoEstimate: true,
  });
  assert.match(summary, /Working measurements are unconfirmed and may include example values/);
  assert.match(summary, /Outside diameter: 180\.25 mm/);
  assert.match(summary, /Opening diameter: Not provided/);
  assert.match(summary, /Thickness: 12\.7 mm/);
  assert.match(summary, /photo estimate is provisional/i);
});

test('an unchanged demonstration is explicitly labeled as example measurements', () => {
  const summary = buildPendingRingInquiry({
    inputs: { outerDiameterMm: '180', innerDiameterMm: '145', thicknessMm: '12' },
    ringUse: '', origin: 'demo', photoEstimate: false,
  });
  assert.match(summary, /currently using example dimensions/i);
  assert.match(summary, /Use: Not specified/);
});

test('a generated ring remains unconfirmed when a partial edit changes overall provenance', () => {
  const summary = buildReviewedRingInquiry({
    dimensions: { outerDiameterMm: 180.25, innerDiameterMm: 145, thicknessMm: 12 },
    ringUse: 'speaker', origin: 'user-entered', photoEstimate: false,
  });
  assert.match(summary, /Dimensions may still include starting examples/);
  assert.match(summary, /Confirm every measurement and fit against the actual parts/);
  assert.match(summary, /Opening diameter: 145 mm/);
});
