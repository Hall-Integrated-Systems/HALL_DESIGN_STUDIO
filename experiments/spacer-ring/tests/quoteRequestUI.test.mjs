import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('the ring help form does not require quote fields and the quote form exposes them before sending', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { default: RingContact } = await server.ssrLoadModule('/experiments/spacer-ring/src/RingContact.tsx');
    const render = mode => renderToStaticMarkup(React.createElement(RingContact, { summary: 'Unconfirmed measurements', mode }));
    const help = render('help');
    const quote = render('quote');
    assert.match(help, /Tell us about your project/);
    assert.doesNotMatch(help, /Quantity \(required\)/);
    assert.match(help, /Nothing is sent until you choose Send message/);
    assert.match(quote, /Request a quote for your ring/);
    assert.match(quote, /Quantity \(required\)/);
    assert.match(quote, /Material preference \(optional\)/);
    assert.match(quote, /Intended use \(optional\)/);
    assert.match(quote, /Unconfirmed measurements/);
    assert.match(quote, /confirm a price with you/);
    assert.match(quote, /Nothing is sent until you choose Send message/);
  } finally {
    await server.close();
  }
});
