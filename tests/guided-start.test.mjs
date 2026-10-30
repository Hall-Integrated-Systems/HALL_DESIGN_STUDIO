import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
let server, StudioWelcome, isStudioGoal;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  ({ StudioWelcome, isStudioGoal } = await server.ssrLoadModule('/src/components/StudioWelcome.tsx'));
});
after(async () => { await server?.close(); });
const render = (goal = null, pendingTemplateId = null) => renderToStaticMarkup(React.createElement(StudioWelcome, { goal, pendingTemplateId, projectTitle: 'My scene', onChooseGoal() {}, onBack() {}, onOpenWorkspace() {}, onStartTemplate() {}, onCancelTemplate() {}, onConfirmTemplate() {} }));
test('start prioritizes the spacer ring and labels visualization separately', () => {
  const html = render();
  assert.match(html, /Create a 3D-printable part/);
  assert.match(html, /href="spacer-ring\/#design"/);
  assert.match(html, /do not create printable geometry/);
  assert.ok(html.indexOf('Spacer ring') < html.indexOf('Visualization workspace'));
  assert.match(html, /Brackets, adapters and enclosures are not yet available/);
});
test('existing goal links still resolve and retain their templates', () => {
  for (const id of ['product', 'brand', 'concept', 'part', 'explore']) {
    assert.equal(isStudioGoal(id), true);
    assert.match(render(id), /Change goal/);
  }
  assert.match(render('part'), /href="spacer-ring\/#design"/);
  assert.match(render('brand'), /RECOMMENDED STARTS/);
});
test('template replacement still asks for confirmation', () => {
  const html = render('brand', 'website-banner');
  assert.match(html, /role="alertdialog"/);
  assert.match(html, /Keep current scene/);
  assert.match(html, /Replace scene/);
});
