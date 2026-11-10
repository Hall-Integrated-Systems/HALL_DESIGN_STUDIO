/// <reference types="vite/client" />
import { useEffect, useRef, useState } from 'react';
import { sendContact, validateContact } from './contactSend.ts';
import QuoteFields from './QuoteFields.tsx';
import { buildInquiryMessage, emptyQuoteDetails, validateQuoteDetails } from './quoteRequest.ts';
import type { InquiryMode } from './quoteRequest.ts';

export default function RingContact({ summary, mode }: { summary: string; mode: InquiryMode }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState(emptyQuoteDetails);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const message = buildInquiryMessage({ summary, mode, quote, note });
  useEffect(() => { setStatus(''); }, [mode]);

  async function copyDetails() {
    try { await navigator.clipboard.writeText(message); setStatus('Project details copied. Paste them into the message on the contact page.'); }
    catch { setStatus('Copy was unavailable. Select and copy the project details below.'); }
  }
  async function reviewAndSend() {
    if (sendingRef.current) return;
    const details = { name: name.trim(), email: email.trim(), subject: mode === 'quote' ? 'Spacer ring quote request' : 'Spacer ring inquiry', message };
    const problem = validateContact(details) || validateQuoteDetails(mode, quote);
    if (problem) { setStatus(problem); return; }
    sendingRef.current = true;
    setSending(true); setStatus('Sending your message…');
    try { await sendContact(details); setStatus('Your message was submitted. Thank you!'); }
    catch (error) { setStatus(error instanceof Error && error.message === 'uncertain' ? 'We could not confirm whether your message was sent. Please contact us before trying again to avoid a duplicate.' : 'Your message could not be sent. Your details are still here; please try again or use the contact page.'); }
    finally { sendingRef.current = false; setSending(false); }
  }
  return <div className="contact-preview" aria-labelledby="ring-contact-title">
    <h3 id="ring-contact-title">{mode === 'quote' ? 'Request a quote for your ring' : 'Tell us about your project'}</h3>
    <p>{mode === 'quote' ? 'HIS will review your design and confirm a price with you. Nothing is sent until you choose Send message.' : "We'll include your ring measurements. Review your message below, then send it to us here. Nothing is sent until you choose Send message."}</p>
    <div className="contact-fields"><div><label htmlFor="contact-name">Your name</label><input id="contact-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div><div><label htmlFor="contact-email">Email address</label><input id="contact-email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div></div>
    {mode === 'quote' && <QuoteFields prefix="ring-quote" value={quote} onChange={setQuote} />}
    <label htmlFor="contact-message">How can we help?</label><textarea id="contact-message" rows={4} maxLength={2500} value={note} onChange={e => setNote(e.target.value)} placeholder="Tell us what you’re making or what you need help with." />
    <label htmlFor="ring-contact-details">Project details</label><textarea id="ring-contact-details" rows={7} value={message} readOnly />
    <div className="guide-actions"><button className="primary" type="button" disabled={!summary || sending} onClick={reviewAndSend}>{sending ? 'Sending…' : 'Send message'}</button><button type="button" disabled={!summary} onClick={copyDetails}>Copy project details</button></div>
    <p role="status">{status}</p><p className="field-help">If you need another way to reach us, use the <a href="https://hallintegratedsystems.com/contact.html" target="_blank" rel="noopener noreferrer">contact page</a> and copy your project details there.</p>
  </div>;
}
