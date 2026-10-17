import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProject, parseProject, serializeProject } from '../src/project.ts';

const dimensions = { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 };
const valid = () => ({
  kind: 'his-spacer-ring-project', schemaVersion: 1, units: 'mm', name: 'A&B <demo>',
  dimensions: { ...dimensions }, provenance: { origin: 'demo', note: '"literal" <not markup>' },
});

test('round-trip preserves explicit dimensions and treats names as literal data', () => {
  const original = createProject({ outerDiameterMm: 165.5, innerDiameterMm: 142.3, thicknessMm: 8.7 }, '  A&B <demo>  ', 'user-entered', '"literal" <not markup>');
  const text = serializeProject(original);
  const parsed = parseProject(text);
  assert.deepEqual(parsed.dimensions, { outerDiameterMm: 165.5, innerDiameterMm: 142.3, thicknessMm: 8.7 });
  assert.equal(parsed.name, 'A&B <demo>');
  assert.equal(parsed.provenance.note, '"literal" <not markup>');
  assert.deepEqual(Object.keys(parsed).sort(), ['dimensions', 'kind', 'name', 'provenance', 'schemaVersion', 'units']);
  parsed.dimensions.outerDiameterMm = 170;
  assert.equal(original.dimensions.outerDiameterMm, 165.5);
});

test('rejects oversized UTF-8 project input before parsing', () => {
  assert.throws(() => parseProject(' '.repeat(65537)), /64 KiB|size/i);
  const multibyte = JSON.stringify({ ...valid(), padding: 'é'.repeat(33000) });
  assert.throws(() => parseProject(multibyte), /64 KiB|size/i);
});

test('rejects unsupported schema, units, unknown fields and wrong types', () => {
  const cases: unknown[] = [
    { ...valid(), kind: 'other' }, { ...valid(), schemaVersion: 2 }, { ...valid(), units: 'inch' },
    { ...valid(), extra: true }, { ...valid(), dimensions: { ...dimensions, extra: 1 } },
    { ...valid(), provenance: { origin: 'demo', note: '', report: { pass: true } } },
    { ...valid(), dimensions: { ...dimensions, outerDiameterMm: '180' } },
    { ...valid(), dimensions: { ...dimensions, innerDiameterMm: null } },
    { ...valid(), dimensions: { ...dimensions, innerDiameterMm: 180 } },
    { ...valid(), dimensions: { ...dimensions, thicknessMm: 0 } },
    { ...valid(), name: '   ' }, { ...valid(), name: 'x'.repeat(121) },
    { ...valid(), provenance: { origin: 'imported' } },
    { ...valid(), provenance: { origin: 'demo', note: 'x'.repeat(1001) } },
    { ...valid(), provenance: { origin: 'demo', note: 4 } },
    { ...valid(), provenance: null },
  ];
  for (const value of cases) assert.throws(() => parseProject(JSON.stringify(value)), JSON.stringify(value));
  assert.throws(() => parseProject('{ bad json'));
  assert.throws(() => serializeProject({ ...valid(), dimensions: { ...dimensions, outerDiameterMm: Infinity } } as never));
  assert.throws(() => createProject({ ...dimensions, thicknessMm: NaN }, 'Valid', 'demo'));
});
