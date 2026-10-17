import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RingWorkflow } from '../src/exportWorkflow.ts';
import { createProject, serializeProject } from '../src/project.ts';

const edited = { outerDiameterMm: 160, innerDiameterMm: 140, thicknessMm: 10 };

test('save and load round-trip reproduces explicit dimensions through regeneration', async () => {
  const workflow = new RingWorkflow();
  workflow.edit();
  workflow.generate(edited, 'A&B <ring>', 'user-entered');
  const saved = workflow.saveProject();
  const loaded = new RingWorkflow();
  loaded.loadProject(saved);
  assert.deepEqual(loaded.project.dimensions, edited);
  assert.equal(loaded.project.name, 'A&B <ring>');
  assert.equal(loaded.artifact?.report.roundTrip.boundsMm.size[0], 160);
  const result = await loaded.prepareExport('3mf');
  assert.equal(result.report.sha256, createHash('sha256').update(result.bytes).digest('hex'));
  assert.equal(result.report.format, '3mf');
});

test('bad project load leaves current project, artifact and revision intact', async () => {
  const workflow = new RingWorkflow();
  const before = workflow.artifact;
  const revision = workflow.revision();
  const invalid = JSON.stringify({ ...JSON.parse(workflow.saveProject()), units: 'inch' });
  assert.throws(() => workflow.loadProject(invalid));
  assert.equal(workflow.artifact, before);
  assert.equal(workflow.revision(), revision);
  assert.equal(workflow.project.units, 'mm');
  assert.equal((await workflow.prepareExport('stl')).report.format, 'stl');
});

test('edits disable both formats and discard a pending hash from the old revision', async () => {
  const workflow = new RingWorkflow();
  const pending = workflow.prepareExport('stl');
  workflow.edit();
  await assert.rejects(pending, /changed|stale/i);
  await assert.rejects(workflow.prepareExport('stl'));
  await assert.rejects(workflow.prepareExport('3mf'));
  workflow.generate(edited, 'New ring', 'user-entered');
  const current = await workflow.prepareExport('stl');
  assert.equal(workflow.isCurrent(current.revision), true);
  workflow.rename();
  assert.equal(workflow.isCurrent(current.revision), false);
});

test('loading valid project regenerates geometry and rejects imported validation status', () => {
  const workflow = new RingWorkflow();
  const project = createProject(edited, 'Portable', 'user-entered', 'Literal <note>');
  workflow.loadProject(serializeProject(project));
  assert.equal(workflow.artifact?.report.stlValidated, true);
  assert.equal(workflow.project.provenance.note, 'Literal <note>');
  const forged = { ...project, validation: { fusionVerified: true } };
  assert.throws(() => workflow.loadProject(JSON.stringify(forged)));
  assert.deepEqual(workflow.project.dimensions, edited);
});
