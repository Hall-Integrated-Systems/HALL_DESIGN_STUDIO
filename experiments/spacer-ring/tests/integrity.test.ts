import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArtifact } from '../src/export.ts';
import { createExportReport, sha256Hex } from '../src/integrity.ts';

const dimensions = { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 };

test('SHA-256 identifies the exact existing demo STL bytes', async () => {
  const bytes = createArtifact(dimensions).bytes;
  assert.equal(await sha256Hex(bytes), '3c9efed34e99ed83321d12a90cb02d808e2a04487121b261a938a8290a205100');
  const changed = bytes.slice(); changed[changed.length - 1] ^= 1;
  assert.notEqual(await sha256Hex(changed), await sha256Hex(bytes));
});

test('report copies dimensions, identifies executed checks and makes no native acceptance claim', async () => {
  const bytes = createArtifact(dimensions).bytes;
  const report = await createExportReport(bytes, 'stl', dimensions, ['source mesh validated', 'binary STL re-read']);
  assert.equal(report.format, 'stl');
  assert.equal(report.units, 'mm');
  assert.equal(report.byteLength, bytes.length);
  assert.equal(report.sha256, '3c9efed34e99ed83321d12a90cb02d808e2a04487121b261a938a8290a205100');
  assert.deepEqual(report.checks, ['source mesh validated', 'binary STL re-read']);
  assert.equal(report.sourceMesh.boundaryEdges, 0);
  dimensions.outerDiameterMm = 181;
  assert.equal(report.parameters.outerDiameterMm, 180);
  assert.doesNotMatch(JSON.stringify(report), /fusion verified|physical validated|qidi accepted/i);
  dimensions.outerDiameterMm = 180;
});

test('report rejects nonfinite parameters and empty checks', async () => {
  await assert.rejects(createExportReport(new Uint8Array([1]), 'stl', { ...dimensions, thicknessMm: Infinity }, ['check']));
  await assert.rejects(createExportReport(new Uint8Array([1]), 'stl', dimensions, []));
});
