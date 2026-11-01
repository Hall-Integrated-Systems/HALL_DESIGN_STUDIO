import test from 'node:test';
import assert from 'node:assert/strict';
import { guidanceSteps, updateGuidanceAnswer, missingGuidanceAnswers } from '../src/plateGuidance.ts';

test('measurement guidance requires explicit answers before a guided download', () => {
  let answers = {};
  assert.equal(missingGuidanceAnswers(answers).length, guidanceSteps.length);
  for (const step of guidanceSteps) answers = updateGuidanceAnswer(answers, step.key, 'confirmed');
  assert.deepEqual(missingGuidanceAnswers(answers), []);
  answers = updateGuidanceAnswer(answers, 'vehiclePitch', 'help');
  assert.deepEqual(missingGuidanceAnswers(answers), ['vehiclePitch']);
});
