import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlateContactSummary } from '../src/plateContact.ts';

test('guided inquiry includes confirmed measurements and marks uncertain examples as needing help', () => {
  const text = buildPlateContactSummary({ size: '6½"', haveParts: 'speaker', unit: 'in', values: { outerDiameterMm: '8', innerDiameterMm: '4.7', speakerCount: '4' }, answers: { outerDiameterMm: 'confirmed', innerDiameterMm: 'help', speakerCount: 'confirmed' }, edited: [], guided: true });
  assert.match(text, /Speaker size: 6½"/);
  assert.match(text, /Outside diameter: 8 in/);
  assert.match(text, /Opening diameter: Needs help/);
  assert.doesNotMatch(text, /Opening diameter: 4.7/);
  assert.match(text, /Number of speaker holes: 4/);
  assert.match(text, /Vehicle hole diameter: Not confirmed/);
});

test('full form identifies edited inputs while unedited examples remain unconfirmed', () => {
  const text = buildPlateContactSummary({ size: '', haveParts: 'unsure', unit: 'mm', values: { outerDiameterMm: '197', innerDiameterMm: '120' }, answers: {}, edited: ['outerDiameterMm'], guided: false });
  assert.match(text, /Outside diameter: 197 mm \(entered\)/);
  assert.match(text, /Opening diameter: Not confirmed/);
});
