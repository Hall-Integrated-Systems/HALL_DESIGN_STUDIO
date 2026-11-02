import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRingContactSummary } from '../src/ringContact.ts';

test('ring inquiry includes the actual dimensions in millimeters and notes photo estimates', () => {
  const text = buildRingContactSummary({ dimensions: { outerDiameterMm: 200, innerDiameterMm: 160, thicknessMm: 14 }, ringUse: 'speaker', origin: 'user-entered', photoEstimate: true });
  assert.match(text, /Outside diameter: 200 mm/);
  assert.match(text, /Opening diameter: 160 mm/);
  assert.match(text, /Thickness: 14 mm/);
  assert.match(text, /photo.*caliper/i);
  assert.doesNotMatch(text, /example measurements/i);
});

test('demo dimensions are identified as examples', () => {
  const text = buildRingContactSummary({ dimensions: { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 }, ringUse: '', origin: 'demo', photoEstimate: false });
  assert.match(text, /example measurements/i);
});
