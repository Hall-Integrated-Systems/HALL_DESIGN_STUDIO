type ContactDetails = { name: string; email: string; subject: string; message: string };

export function validateContact(details: ContactDetails): string {
  if (!details.name.trim()) return 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) return 'Please enter a valid email address.';
  if (!details.message.trim() || details.message.length > 5000) return 'Please check your project details and shorten your notes if needed.';
  return '';
}

export function sendContact(details: ContactDetails): Promise<void> {
  const bridge = new URL('https://hallintegratedsystems.com/studio-contact-bridge.html');
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Contact connection';
    let submitted = false;
    const cleanup = () => { window.clearTimeout(timer); window.removeEventListener('message', receive); frame.remove(); };
    const receive = (event: MessageEvent) => {
      if (event.origin !== bridge.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'his-studio-contact-ready' && !submitted) {
        submitted = true;
        frame.contentWindow?.postMessage({ type: 'his-studio-contact-send', ...details }, bridge.origin);
      } else if (event.data?.type === 'his-studio-contact-result' && submitted) {
        cleanup();
        if (event.data.ok === true) resolve(); else reject(new Error('uncertain'));
      }
    };
    const timer = window.setTimeout(() => { cleanup(); reject(new Error(submitted ? 'uncertain' : 'not-sent')); }, 30000);
    window.addEventListener('message', receive);
    frame.src = bridge.href;
    document.body.appendChild(frame);
  });
}
