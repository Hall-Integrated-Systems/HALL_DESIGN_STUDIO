/// <reference types="vite/client" />
import { useState } from 'react';

export default function RingContact({ summary }: { summary: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const message = `${summary}${note.trim() ? `\n\nCustomer notes:\n${note.trim()}` : ''}`;

  async function copyDetails() {
    try { await navigator.clipboard.writeText(message); setStatus('Project details copied. Paste them into the message on the contact page.'); }
    catch { setStatus('Copy was unavailable. Select and copy the project details below.'); }
  }
  function reviewAndSend() {
    const localUrl = import.meta.env.DEV ? import.meta.env.VITE_PLATE_CONTACT_URL : undefined;
    let candidate: URL;
    try { candidate = new URL(localUrl || 'https://hallintegratedsystems.com/contact.html'); }
    catch { setStatus('The contact page is unavailable. Copy your project details instead.'); return; }
    const isLocal = candidate.protocol === 'http:' && (candidate.hostname === '127.0.0.1' || candidate.hostname === 'localhost');
    if (localUrl && !isLocal) { setStatus('The contact page is unavailable. Copy your project details instead.'); return; }
    if (!summary || message.length > 5000) { setStatus('Please check your project details and shorten your notes if needed.'); return; }
    const popup = window.open(candidate.href, '_blank');
    if (!popup) { setStatus('The contact page could not open. Copy your project details instead.'); return; }
    setStatus('Opening the contact page so you can review and send your message.');
    let transferred = false;
    const receive = (event: MessageEvent) => {
      if (event.origin !== candidate.origin || event.source !== popup) return;
      if (event.data?.type === 'his-plate-contact-ready' && !transferred) {
        transferred = true;
        popup.postMessage({ type: 'his-ring-contact-details', name, email, message }, candidate.origin);
      } else if (event.data?.type === 'his-plate-contact-received' && transferred) {
        window.clearTimeout(timeout); window.clearInterval(handshake); window.removeEventListener('message', receive);
        setStatus('Your details are ready to review on the contact page. Select Send message there when you are ready.');
      }
    };
    window.addEventListener('message', receive);
    const hello = () => { if (!popup.closed && !transferred) popup.postMessage({ type: 'his-plate-contact-hello' }, candidate.origin); };
    const handshake = window.setInterval(hello, 400);
    const timeout = window.setTimeout(() => { window.clearInterval(handshake); window.removeEventListener('message', receive); setStatus('The contact page did not confirm the transfer. Copy your project details and paste them into its message instead.'); }, 10000);
    hello();
  }
  return <div className="contact-preview" aria-labelledby="ring-contact-title">
    <h3 id="ring-contact-title">Tell us about your project</h3>
    <p>We’ll include your ring measurements. You can review your message before sending it.</p>
    <div className="contact-fields"><div><label htmlFor="contact-name">Your name</label><input id="contact-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div><div><label htmlFor="contact-email">Email address</label><input id="contact-email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div></div>
    <label htmlFor="contact-message">How can we help?</label><textarea id="contact-message" rows={4} maxLength={2500} value={note} onChange={e => setNote(e.target.value)} placeholder="Tell us what you’re making or what you need help with." />
    <label htmlFor="ring-contact-details">Project details</label><textarea id="ring-contact-details" rows={7} value={message} readOnly />
    <div className="guide-actions"><button className="primary" type="button" disabled={!summary} onClick={reviewAndSend}>Review &amp; send message</button><button type="button" disabled={!summary} onClick={copyDetails}>Copy project details</button></div>
    <p role="status">{status}</p><p className="field-help">If the details don’t appear on the <a href="https://hallintegratedsystems.com/contact.html" target="_blank" rel="noopener noreferrer">contact page</a>, copy and paste them there.</p>
  </div>;
}
