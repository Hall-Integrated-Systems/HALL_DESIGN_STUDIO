import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInquiryMessage, emptyQuoteDetails, validateQuoteDetails } from '../src/quoteRequest.ts';
import { buildPendingRingInquiry, buildReviewedRingInquiry } from '../src/ringPendingInquiry.ts';
import { buildPlateContactSummary, buildPlateQuoteSummary } from '../src/plateContact.ts';

test('quote requests require a positive whole-number quantity while help never requires quote fields', () => {
  assert.equal(validateQuoteDetails('help', emptyQuoteDetails), '');
  for (const quantity of ['', '0', '-1', '1.5', '1e3', '9007199254740992']) {
    assert.match(validateQuoteDetails('quote', { ...emptyQuoteDetails, quantity }), /quantity.*whole number/i);
  }
  for (const quantity of ['1', '24', '9007199254740991']) {
    assert.equal(validateQuoteDetails('quote', { ...emptyQuoteDetails, quantity }), '');
  }
});

test('ring quote retains dimensions, example warnings, preferences and source without asserting a price', () => {
  const summary = buildReviewedRingInquiry({ dimensions: { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 }, ringUse: 'speaker', origin: 'user-entered', photoEstimate: true });
  const message = buildInquiryMessage({ summary, mode: 'quote', quote: { quantity: '2', material: 'PETG', intendedUse: 'Speaker adapter' }, note: 'Please advise on fit.' });
  assert.match(message, /Submitted via: Hall Design Studio/);
  assert.match(message, /Request type: Quote/);
  assert.match(message, /Outside diameter: 180 mm/);
  assert.match(message, /Dimensions may still include starting examples/);
  assert.match(message, /photo estimate/i);
  assert.match(message, /Quantity: 2/);
  assert.match(message, /Material preference: PETG/);
  assert.match(message, /Intended use: Speaker adapter/);
  assert.match(message, /Price and material availability are to be confirmed by HIS/);
  assert.match(message, /Customer notes:\nPlease advise on fit/);
  assert.doesNotMatch(message, /\$\d/);
});

test('plate quote retains unconfirmed and help statuses, and records missing optional preferences', () => {
  const summary = buildPlateContactSummary({ size: '6.5"', haveParts: 'speaker', unit: 'mm', values: { outerDiameterMm: '200', innerDiameterMm: '120' }, answers: { innerDiameterMm: 'help' }, edited: ['outerDiameterMm'], guided: false });
  const message = buildInquiryMessage({ summary, mode: 'quote', quote: { ...emptyQuoteDetails, quantity: '4' }, note: '' });
  assert.match(message, /Submitted via: Hall Design Studio/);
  assert.match(message, /Outside diameter: 200 mm \(entered\)/);
  assert.match(message, /Opening diameter: Needs help/);
  assert.match(message, /Number of speaker holes: Not confirmed/);
  assert.match(message, /Quantity: 4/);
  assert.match(message, /Material preference: Not specified/);
  assert.match(message, /Intended use: Not specified/);
});

test('plate quote identifies the working design without presenting examples as confirmed measurements', () => {
  const details = { size: '6.5"', haveParts: 'speaker', unit: 'in' as const, values: { outerDiameterMm: '8', innerDiameterMm: '4', thicknessMm: '0.25', speakerCount: '4', speakerRotation: '45' }, answers: { innerDiameterMm: 'help' as const, speakerCount: 'confirmed' as const }, edited: ['outerDiameterMm'], guided: false };
  const dimensions = { outerDiameterMm: 203.2, innerDiameterMm: 101.6, thicknessMm: 6.35, speaker: { count: 4, pitchDiameterMm: NaN, holeDiameterMm: NaN, rotationDeg: 45 }, vehicle: { count: NaN, pitchDiameterMm: NaN, holeDiameterMm: NaN, rotationDeg: NaN } };
  const help = buildPlateContactSummary(details);
  const quote = buildPlateQuoteSummary(details, dimensions);
  assert.match(help, /Opening diameter: Needs help/);
  assert.doesNotMatch(help, /Opening diameter: 101\.6 mm/);
  assert.match(quote, /Working plate design values \(millimeters; rounded to six decimals; not verified for manufacturing\)/);
  assert.match(quote, /Outside diameter: 203\.2 mm \(entered; unconfirmed\)/);
  assert.match(quote, /Opening diameter: 101\.6 mm \(help requested; unconfirmed and may be an example\)/);
  assert.match(quote, /Plate thickness: 6\.35 mm \(starting example; unconfirmed\)/);
  assert.match(quote, /Number of speaker holes: 4 \(confirmed by customer; fit not verified\)/);
  assert.match(quote, /Speaker pattern rotation: 45° \(starting example; unconfirmed\)/);
  assert.match(quote, /Number of vehicle holes: Not provided \(unconfirmed\)/);
});

test('plate quote takes millimeter values from model geometry when a unit conversion display is rounded', () => {
  const details = { size: '', haveParts: 'unsure', unit: 'in' as const, values: { outerDiameterMm: '7.874016' }, answers: {}, edited: ['outerDiameterMm'], guided: false };
  const dimensions = { outerDiameterMm: 200, innerDiameterMm: NaN, thicknessMm: NaN, speaker: { count: NaN, pitchDiameterMm: NaN, holeDiameterMm: NaN, rotationDeg: NaN }, vehicle: { count: NaN, pitchDiameterMm: NaN, holeDiameterMm: NaN, rotationDeg: NaN } };
  const quote = buildPlateQuoteSummary(details, dimensions);
  assert.match(quote, /Outside diameter: 200 mm \(entered; unconfirmed\)/);
  assert.doesNotMatch(quote, /200\.000006 mm/);
});

test('early help includes unfinished details and notes but does not include or require quote data', () => {
  const summary = buildPendingRingInquiry({ inputs: { outerDiameterMm: '180', innerDiameterMm: '', thicknessMm: '12' }, ringUse: '', origin: 'demo', photoEstimate: false });
  const message = buildInquiryMessage({ summary, mode: 'help', quote: { quantity: '2', material: 'PETG', intendedUse: 'Speaker' }, note: 'I need help measuring.' });
  assert.match(message, /Submitted via: Hall Design Studio/);
  assert.match(message, /Request type: Help/);
  assert.match(message, /Opening diameter: Not provided/);
  assert.match(message, /working measurements are unconfirmed/i);
  assert.match(message, /currently using example dimensions/i);
  assert.match(message, /I need help measuring/);
  assert.doesNotMatch(message, /Quantity:|Material preference:|Intended use:/);
});
