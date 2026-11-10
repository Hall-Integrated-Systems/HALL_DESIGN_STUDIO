import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let server, PlateStart, PlateStepNavigation, ovalSpeakerSizes;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  ({ PlateStart, PlateStepNavigation, ovalSpeakerSizes } = await server.ssrLoadModule('/experiments/spacer-ring/src/PlateDesigner.tsx'));
});
after(async () => { await server?.close(); });

const noop = () => {};
function start(size) {
  return renderToStaticMarkup(React.createElement(PlateStart, { size, haveParts: 'unsure', onSizeChange: noop, onPartsChange: noop, onContinue: noop, onAskForHelp: noop }));
}
function navigation(size) {
  return renderToStaticMarkup(React.createElement(PlateStepNavigation, { size, stage: 1, canReview: false, onStageChange: noop }));
}

test('each listed oval size directs customers to help instead of the round-plate measurements', () => {
  for (const size of ovalSpeakerSizes) {
    const html = start(size);
    assert.match(html, /oval size/i, size);
    assert.match(html, />Ask HIS about this speaker<\/button>/, size);
    assert.doesNotMatch(html, />Continue to measurements<\/button>/, size);
    assert.match(navigation(size), /<button[^>]*disabled=""[^>]*>2\. Measurements<\/button>/, size);
  }
});

test('round, custom and skipped choices still allow the measurement flow', () => {
  for (const size of ['6½"', 'Custom', '']) {
    assert.match(start(size), />Continue to measurements<\/button>/, size);
    assert.doesNotMatch(start(size), />Ask HIS about this speaker<\/button>/, size);
    assert.doesNotMatch(navigation(size), /<button[^>]*disabled=""[^>]*>2\. Measurements<\/button>/, size);
  }
});
