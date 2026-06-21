type ClarityFunction = {
  (command: 'event', eventName: string): void;
  (command: 'set', key: string, value: string): void;
};

declare global {
  interface Window {
    clarity?: ClarityFunction;
  }
}

export function trackClarityEvent(eventName: string) {
  if (typeof window.clarity === 'function') {
    window.clarity('event', eventName);
  }
}

export function setClarityTag(key: string, value: string) {
  if (typeof window.clarity === 'function') {
    window.clarity('set', key, value);
  }
}

export function initializeClarity() {
  setClarityTag('site_type', 'studio_app');
  setClarityTag('business', 'hall_integrated_systems');
  setClarityTag('hostname', window.location.hostname);
  setClarityTag('path', window.location.pathname);
  setClarityTag('app', 'hall_product_studio');
  trackClarityEvent('studio_loaded');
}
