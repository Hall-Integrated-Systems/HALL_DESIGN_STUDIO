import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExportSession } from '../src/exportSession.ts';

test('an edit invalidates an in-flight digest and only the newest input revision is eligible', async () => {
  const session = new ExportSession();
  const old = session.begin();
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  const digest = delayed.then(() => ({ revision: old, sha256: 'old' }));
  session.invalidate();
  const current = session.begin();
  release();
  const completed = await digest;
  assert.equal(session.isCurrent(completed.revision), false);
  assert.equal(session.isCurrent(current), true);
  session.invalidate();
  assert.equal(session.isCurrent(current), false);
});
