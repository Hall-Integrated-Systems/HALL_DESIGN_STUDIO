import type { QuoteDetails } from './quoteRequest.ts';
import './QuoteFields.css';

export default function QuoteFields({ prefix, value, onChange }: {
  prefix: string;
  value: QuoteDetails;
  onChange: (value: QuoteDetails) => void;
}) {
  return <div className="quote-fields">
    <div className="contact-fields">
      <div><label htmlFor={`${prefix}-quantity`}>Quantity (required)</label><input id={`${prefix}-quantity`} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={16} aria-required="true" value={value.quantity} onChange={e => onChange({ ...value, quantity: e.target.value })} /></div>
      <div><label htmlFor={`${prefix}-material`}>Material preference (optional)</label><input id={`${prefix}-material`} type="text" maxLength={120} value={value.material} onChange={e => onChange({ ...value, material: e.target.value })} placeholder="For example, PETG" /></div>
    </div>
    <label htmlFor={`${prefix}-use`}>Intended use (optional)</label><textarea id={`${prefix}-use`} rows={2} maxLength={250} value={value.intendedUse} onChange={e => onChange({ ...value, intendedUse: e.target.value })} placeholder="How and where will this part be used?" />
  </div>;
}
