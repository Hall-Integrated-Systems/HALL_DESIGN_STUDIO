import test from 'node:test';
import assert from 'node:assert/strict';
import { sendContact, validateContact } from '../src/contactSend.ts';

const details = { name: 'Customer', email: 'customer@example.com', subject: 'Spacer ring inquiry', message: 'Outside diameter: 200 mm' };
test('contact details require a name, valid email, and bounded message', () => {
  assert.equal(validateContact(details), '');
  assert.match(validateContact({ ...details, name: '' }), /name/);
  assert.match(validateContact({ ...details, email: 'bad' }), /email/);
  assert.match(validateContact({ ...details, message: 'x'.repeat(5001) }), /shorten/);
});
test('sender waits for the trusted frame, passes measurements once, and requires its result', async () => {
  let handler: (event: any) => void = () => {};
  const sent: any[] = [];
  const frameWindow = { postMessage: (payload: any, origin: string) => sent.push({ payload, origin }) };
  const frame = { hidden: false, title: '', src: '', contentWindow: frameWindow, remove() {} };
  const originalWindow = globalThis.window, originalDocument = globalThis.document;
  // This fixture has no network or email transport.
  globalThis.window = { addEventListener: (_: string, fn: typeof handler) => { handler = fn; }, removeEventListener() {}, setTimeout, clearTimeout } as any;
  globalThis.document = { createElement: () => frame, body: { appendChild() {} } } as any;
  try {
    const pending = sendContact(details);
    handler({ origin: 'https://untrusted.example', source: frameWindow, data: { type: 'his-studio-contact-ready' } });
    assert.equal(sent.length, 0);
    handler({ origin: 'https://hallintegratedsystems.com', source: frameWindow, data: { type: 'his-studio-contact-ready' } });
    handler({ origin: 'https://hallintegratedsystems.com', source: frameWindow, data: { type: 'his-studio-contact-ready' } });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].payload.message, details.message);
    handler({ origin: 'https://hallintegratedsystems.com', source: frameWindow, data: { type: 'his-studio-contact-result', ok: true } });
    await pending;
  } finally { globalThis.window = originalWindow; globalThis.document = originalDocument; }
});
