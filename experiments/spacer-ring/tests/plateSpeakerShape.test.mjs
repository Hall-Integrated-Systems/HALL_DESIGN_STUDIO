import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, isOvalSpeakerSize, ovalSpeakerSizes, speakerSizes, PlateDiagram;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  ({ isOvalSpeakerSize, ovalSpeakerSizes, speakerSizes, PlateDiagram } = await server.ssrLoadModule('/experiments/spacer-ring/src/PlateDesigner.tsx'));
});
after(async () => { await server?.close(); });

test('every listed oval choice is recognized and round, custom and skipped choices stay available', () => {
  assert.deepEqual(ovalSpeakerSizes, ['4×6"', '5×7"', '6×8"', '6×9"']);
  assert.deepEqual(speakerSizes.filter(isOvalSpeakerSize), ovalSpeakerSizes);
  for (const size of ['3½"', '4"', '5¼"', '6"', '6½"', '6¾"', '8"', 'Custom', '']) {
    assert.equal(isOvalSpeakerSize(size), false, size);
  }
});

test('plate diagram identifies the two patterns without relying on color', () => {
  const dimensions = { outerDiameterMm: 200, innerDiameterMm: 120, thicknessMm: 6, speaker: { count: 1, pitchDiameterMm: 150, holeDiameterMm: 4, rotationDeg: 90 }, vehicle: { count: 1, pitchDiameterMm: 180, holeDiameterMm: 5, rotationDeg: 0 } };
  for (const guide of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(PlateDiagram, { dimensions, guide }));
    assert.match(html, /Speaker holes have solid outlines; vehicle holes have dashed outlines/);
    assert.match(html, /class="speaker-hole"/);
    assert.match(html, /class="vehicle-hole"/);
  }
});
