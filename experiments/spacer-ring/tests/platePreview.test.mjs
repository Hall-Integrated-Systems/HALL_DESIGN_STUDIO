import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('top view shows positive rotation counterclockwise as in the exported mesh', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { PlateDiagram } = await server.ssrLoadModule('/experiments/spacer-ring/src/PlateDesigner.tsx');
    const dimensions = { outerDiameterMm: 200, innerDiameterMm: 120, thicknessMm: 6, speaker: { count: 1, pitchDiameterMm: 150, holeDiameterMm: 4, rotationDeg: 90 }, vehicle: { count: 1, pitchDiameterMm: 180, holeDiameterMm: 5, rotationDeg: 0 } };
    const html = renderToStaticMarkup(React.createElement(PlateDiagram, { dimensions }));
    assert.match(html, /cy="-75" r="2" class="speaker-hole"/);
  } finally { await server.close(); }
});
