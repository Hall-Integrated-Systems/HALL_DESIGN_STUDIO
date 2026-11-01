import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, RingGuidance, photoFieldFromNote, withoutPhotoNote;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  ({ RingGuidance } = await server.ssrLoadModule('/experiments/spacer-ring/src/RingGuidance.tsx'));
  ({ photoFieldFromNote, withoutPhotoNote } = await server.ssrLoadModule('/experiments/spacer-ring/src/App.tsx'));
});
after(async () => { await server?.close(); });
test('every ring use displays measurement guidance and generator limits', () => {
  for (const kind of ['speaker', 'subwoofer', 'tweeter', 'general']) {
    const html = renderToStaticMarkup(React.createElement(RingGuidance, { kind, onKindChange() {} }));
    assert.match(html, /What kind of ring/);
    assert.match(html, /Outside diameter/);
    assert.match(html, /Opening diameter/);
    assert.match(html, /Thickness/);
    assert.match(html, /circumference/i);
    assert.match(html, /nominal speaker size/i);
    assert.match(html, /mounting holes/i);
    assert.match(html, /concentric ring/i);
  }
  assert.match(renderToStaticMarkup(React.createElement(RingGuidance, { kind: 'tweeter', onKindChange() {} })), /complete adapter/i);
});
test('identifies photo-derived fields without treating an ordinary project note as a photo', () => {
  assert.equal(photoFieldFromNote('User-confirmed provisional photo proposal for Outside diameter from demo.png'), 'outerDiameterMm');
  assert.equal(photoFieldFromNote('User-confirmed provisional photo proposal for Opening diameter from demo.png'), 'innerDiameterMm');
  assert.equal(photoFieldFromNote('User-confirmed provisional photo proposal for Thickness from demo.png'), 'thicknessMm');
  assert.equal(photoFieldFromNote('Customer supplied measurements'), null);
  assert.equal(photoFieldFromNote(undefined), null);
  const combined = 'Customer supplied measurements\nUser-confirmed provisional photo proposal for Thickness from demo.png';
  assert.equal(photoFieldFromNote(combined), 'thicknessMm');
  assert.equal(withoutPhotoNote(combined), 'Customer supplied measurements');
});
