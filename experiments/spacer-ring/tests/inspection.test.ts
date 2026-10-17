import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInspection, differenceMm, parseInspection, parseReadings, serializeInspection } from '../src/inspection.ts';

const nominal = { outerDiameterMm: 150, innerDiameterMm: 130, thicknessMm: 6 };
const input = () => ({
  partName: 'Blue 150/130/6 prototype', recordedOn: '2026-10-15', nominal: { ...nominal },
  readings: { outerDiameterMm: [149.70], innerDiameterMm: [], thicknessMm: [6.12] },
  acceptedMeasurements: ['outerDiameterMm', 'thicknessMm'],
  fit: { status: 'not-checked', note: '' },
  note: 'Owner accepts the measured OD and height deviations for this prototype; opening and fit are pending.',
}) as const;

test('separate inspection round-trip preserves two accepted readings and an open bore and fit', () => {
  const record = createInspection(input());
  const restored = parseInspection(serializeInspection(record));
  assert.deepEqual(restored.readings.outerDiameterMm, [149.70]);
  assert.deepEqual(restored.readings.innerDiameterMm, []);
  assert.deepEqual(restored.readings.thicknessMm, [6.12]);
  assert.deepEqual(restored.acceptedMeasurements, ['outerDiameterMm', 'thicknessMm']);
  assert.equal(restored.fit.status, 'not-checked');
  assert.equal(differenceMm(149.70, restored.nominal.outerDiameterMm), -0.30);
  assert.equal(differenceMm(6.12, restored.nominal.thicknessMm), 0.12);
  restored.readings.outerDiameterMm.push(150);
  assert.deepEqual(record.readings.outerDiameterMm, [149.70]);
  assert.equal(JSON.parse(serializeInspection(record)).kind, 'his-spacer-ring-inspection');
});

test('readings input accepts repeats and rejects invalid or excessive values', () => {
  assert.deepEqual(parseReadings('149.70, 149.82\n150.00'), [149.70, 149.82, 150]);
  assert.deepEqual(parseReadings(' \n '), []);
  assert.throws(() => parseReadings('149.7 mm'), /reading|number/i);
  assert.throws(() => parseReadings('0'), /positive/i);
  assert.throws(() => parseReadings(Array(17).fill('150').join(',')), /16/i);
});

test('inspection cannot accept unmeasured features or claim fit without a note', () => {
  assert.throws(() => createInspection({ ...input(), acceptedMeasurements: ['innerDiameterMm'] }), /reading/i);
  assert.throws(() => createInspection({ ...input(), acceptedMeasurements: ['outerDiameterMm', 'outerDiameterMm'] }), /duplicate/i);
  assert.throws(() => createInspection({ ...input(), note: '' }), /note/i);
  assert.throws(() => createInspection({ ...input(), fit: { status: 'acceptable', note: '' } }), /fit note/i);
});

test('inspection parser rejects malformed, oversized, and unexpected data', () => {
  const valid = createInspection(input());
  for (const changed of [
    { ...valid, units: 'inch' }, { ...valid, schemaVersion: 2 },
    { ...valid, surprise: true }, { ...valid, recordedOn: '2026-02-30' },
    { ...valid, nominal: { ...nominal, outerDiameterMm: 130 } },
    { ...valid, readings: { ...valid.readings, outerDiameterMm: [Infinity] } },
    { ...valid, acceptedMeasurements: ['wrong-key'] },
    { ...valid, fit: { status: 'approved', note: 'yes' } },
  ]) assert.throws(() => parseInspection(JSON.stringify(changed)));
  assert.throws(() => parseInspection(' '.repeat(65537)), /64 KiB/i);
  assert.throws(() => parseInspection('{ bad json'));
});
