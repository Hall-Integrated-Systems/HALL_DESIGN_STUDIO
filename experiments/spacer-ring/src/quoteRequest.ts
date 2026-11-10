export type InquiryMode = 'help' | 'quote';

export interface QuoteDetails {
  quantity: string;
  material: string;
  intendedUse: string;
}

export const emptyQuoteDetails: QuoteDetails = { quantity: '', material: '', intendedUse: '' };

export function validateQuoteDetails(mode: InquiryMode, details: QuoteDetails): string {
  if (mode === 'help') return '';
  const quantity = details.quantity.trim();
  if (!/^\d+$/.test(quantity) || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1) {
    return 'Please enter a quantity of at least 1 as a whole number.';
  }
  return '';
}

export function buildInquiryMessage({ summary, mode, quote, note }: {
  summary: string;
  mode: InquiryMode;
  quote: QuoteDetails;
  note: string;
}): string {
  const lines = ['Submitted via: Hall Design Studio', mode === 'quote' ? 'Request type: Quote' : 'Request type: Help', summary];
  if (mode === 'quote') {
    lines.push(`Quantity: ${quote.quantity.trim() || 'Not provided'}`);
    lines.push(`Material preference: ${quote.material.trim() || 'Not specified'}`);
    lines.push(`Intended use: ${quote.intendedUse.trim() || 'Not specified'}`);
    lines.push('Price and material availability are to be confirmed by HIS.');
  }
  if (note.trim()) lines.push(`Customer notes:\n${note.trim()}`);
  return lines.join('\n\n');
}
