import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server;
let preview;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  preview = await server.ssrLoadModule('/experiments/spacer-ring/src/Preview.tsx');
});
after(async () => { await server?.close(); });

test('fallback gives a proportional, labeled top view using the current nominal dimensions', () => {
  assert.equal(typeof preview.RingPreviewFallback, 'function', 'A 2D fallback must be available when graphics cannot start');
  const parameters = Object.freeze({ outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 });
  const html = renderToStaticMarkup(React.createElement(preview.RingPreviewFallback, { parameters }));
  assert.match(html, /role="img"/);
  assert.match(html, /2D top view/i);
  assert.match(html, /180 mm/);
  assert.match(html, /145 mm/);
  assert.match(html, /12 mm/);
  assert.match(html, /3D preview (?:is )?unavailable/i);
  assert.match(html, /download/i);
  const radii = [...html.matchAll(/<circle\b[^>]*\br="([\d.]+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(radii, [90, 72.5], 'the top view must preserve the outside/opening ratio');
});

test('fallback formats displayed and accessible dimensions without changing the SVG geometry', () => {
  const parameters = { outerDiameterMm: 0.3 * 25.4, innerDiameterMm: 0.1 * 25.4, thicknessMm: 0.05 * 25.4 };
  const html = renderToStaticMarkup(React.createElement(preview.RingPreviewFallback, { parameters }));
  assert.match(html, /aria-label="2D top view of a ring: outside diameter 7\.62 mm, opening diameter 2\.54 mm, thickness 1\.27 mm"/);
  assert.match(html, /Outside 7\.62 mm · Opening 2\.54 mm · Thickness 1\.27 mm/);
  const radii = [...html.matchAll(/<circle\b[^>]*\br="([\d.]+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(radii, [parameters.outerDiameterMm / 2, parameters.innerDiameterMm / 2]);
});

test('WebGL capability check handles unavailable and throwing contexts', () => {
  assert.equal(typeof preview.probeWebGL2, 'function', 'WebGL capability needs an explicit check');
  assert.equal(preview.probeWebGL2(() => ({ getContext: () => null })), false);
  assert.equal(preview.probeWebGL2(() => ({ getContext: () => { throw new Error('blocked'); } })), false);
});

test('WebGL capability check releases a successful temporary context', () => {
  assert.equal(typeof preview.probeWebGL2, 'function', 'WebGL capability needs an explicit check');
  let released = false;
  const canvas = { getContext: kind => kind === 'webgl2' ? { getExtension: name => name === 'WEBGL_lose_context' ? { loseContext() { released = true; } } : null } : null };
  assert.equal(preview.probeWebGL2(() => canvas), true);
  assert.equal(released, true);
});

test('renderer construction failure requests a fallback and preserves the diagnostic error', () => {
  assert.equal(typeof preview.createRendererWithFallback, 'function', 'Renderer initialization needs a failure signal');
  const failure = new Error('WebGL context could not be created');
  let fallbackRequested = false;
  assert.throws(() => preview.createRendererWithFallback(() => { throw failure; }, () => { fallbackRequested = true; }), failure);
  assert.equal(fallbackRequested, true);
});
