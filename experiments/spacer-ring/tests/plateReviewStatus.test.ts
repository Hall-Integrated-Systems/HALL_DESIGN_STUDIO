import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPlateReview } from '../src/plateContact.ts';
import { guidanceSteps } from '../src/plateGuidance.ts';

test('unentered measurements remain example or unknown even when another value was confirmed', () => {
  assert.equal(classifyPlateReview({ answers: { outerDiameterMm: 'confirmed' }, edited: ['outerDiameterMm'] }), 'example');
});

test('measurements entered in the full form are not silently treated as confirmed', () => {
  assert.equal(classifyPlateReview({ answers: {}, edited: guidanceSteps.map(step => step.key) }), 'unconfirmed');
});

test('confirmed status requires the customer to confirm every measurement', () => {
  const answers = Object.fromEntries(guidanceSteps.map(step => [step.key, 'confirmed'])) as Parameters<typeof classifyPlateReview>[0]['answers'];
  assert.equal(classifyPlateReview({ answers, edited: [] }), 'confirmed');
  assert.notEqual(classifyPlateReview({ answers: { ...answers, speakerHole: 'help' }, edited: [] }), 'confirmed');
});
