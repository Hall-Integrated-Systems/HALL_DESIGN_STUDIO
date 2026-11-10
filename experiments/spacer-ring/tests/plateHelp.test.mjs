import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('a customer can find the help action immediately and the inquiry does not claim example values', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { default: PlateDesigner } = await server.ssrLoadModule('/experiments/spacer-ring/src/PlateDesigner.tsx');
    const html = renderToStaticMarkup(React.createElement(PlateDesigner));
    assert.match(html, /aria-controls="plate-inquiry"[^>]*>Ask HIS for help<\/button>/);
    assert.match(html, /id="plate-inquiry"[^>]*hidden=""/);
    assert.match(html, /Nothing is sent until you choose Send message/);
    assert.match(html, /Outside diameter: Not confirmed/);
    assert.doesNotMatch(html, /Outside diameter: 200 mm/);
  } finally {
    await server.close();
  }
});
