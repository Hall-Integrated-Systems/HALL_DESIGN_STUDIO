import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlateContactSummary } from '../src/plateContact.ts';
import { buildRingContactSummary } from '../src/ringContact.ts';

test('ring inquiry formats floating-point conversion noise without changing design dimensions', () => {
  const dimensions = { outerDiameterMm: 101.59999999999998, innerDiameterMm: 55.5, thicknessMm: 6.35 };
  const before = { ...dimensions };
  const summary = buildRingContactSummary({ dimensions, ringUse: 'speaker', origin: 'user-entered', photoEstimate: false });
  assert.match(summary, /Outside diameter: 101\.6 mm/);
  assert.doesNotMatch(summary, /101\.59999999999998/);
  assert.deepEqual(dimensions, before);
});

test('plate inquiry formats reported values without presenting unknowns as confirmed', () => {
  const values = { outerDiameterMm: '101.59999999999998', innerDiameterMm: '50', speakerCount: '4', speakerRotation: '0.30000000000000004' };
  const before = { ...values };
  const summary = buildPlateContactSummary({ size: '', haveParts: 'speaker', unit: 'mm', values, answers: { outerDiameterMm: 'confirmed', innerDiameterMm: 'help', speakerRotation: 'confirmed' }, edited: [], guided: true });
  assert.match(summary, /Outside diameter: 101\.6 mm \(confirmed\)/);
  assert.match(summary, /Opening diameter: Needs help/);
  assert.doesNotMatch(summary, /Opening diameter: 50/);
  assert.match(summary, /Number of speaker holes: Not confirmed/);
  assert.match(summary, /Speaker pattern rotation: 0\.3/);
  assert.deepEqual(values, before);
});

test('plate inquiry preserves entered values and the selected display unit', () => {
  const summary = buildPlateContactSummary({ size: '', haveParts: 'unsure', unit: 'in', values: { outerDiameterMm: '2.9999999999999996' }, answers: {}, edited: ['outerDiameterMm'], guided: false });
  assert.match(summary, /Outside diameter: 3 in \(entered\)/);
  assert.match(summary, /Opening diameter: Not confirmed/);
});
