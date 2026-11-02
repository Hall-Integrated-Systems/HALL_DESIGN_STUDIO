/// <reference types="vite/client" />
import { useState } from 'react';
import { createPlateArtifact, plateHoles, validatePlateDimensions } from './plateGeometry.ts';
import type { HolePattern, PlateDimensions } from './plateGeometry.ts';
import { formatMeasurement, toMillimeters } from './unitsAndSize.ts';
import type { MeasurementUnit } from './unitsAndSize.ts';
import { guidanceSteps, missingGuidanceAnswers, updateGuidanceAnswer } from './plateGuidance.ts';
import type { GuidanceAnswers, GuidanceKey } from './plateGuidance.ts';
import { buildPlateContactSummary } from './plateContact.ts';
import { sendContact, validateContact } from './contactSend.ts';

const example: PlateDimensions = { outerDiameterMm: 200, innerDiameterMm: 120, thicknessMm: 6, speaker: { count: 4, pitchDiameterMm: 150, holeDiameterMm: 4, rotationDeg: 0 }, vehicle: { count: 4, pitchDiameterMm: 180, holeDiameterMm: 5, rotationDeg: 45 } };
const speakerSizes = ['3½"', '4"', '5¼"', '6"', '6½"', '6¾"', '8"', '4×6"', '5×7"', '6×8"', '6×9"', 'Custom'];
type DimensionKey = 'outerDiameterMm' | 'innerDiameterMm' | 'thicknessMm';
type PatternKey = keyof HolePattern;
const msg = (error: unknown) => error instanceof Error ? error.message : 'Unable to create the plate.';

export function PlateDiagram({ dimensions, guide = false, activeKey }: { dimensions: PlateDimensions; guide?: boolean; activeKey?: GuidanceKey }) {
  const radius = dimensions.outerDiameterMm / 2;
  const holes = plateHoles(dimensions);
  return <svg viewBox={`${-radius - 15} ${-radius - 15} ${2 * radius + 30} ${2 * radius + 30}`} role="img" aria-label={guide ? 'Diagram showing the plate edge, opening, and both screw patterns' : 'Top view of the generated plate with speaker and vehicle mounting holes'}>
    <circle r={radius} className={`plate-outline${activeKey === 'outerDiameterMm' ? ' plate-active' : ''}`} /><circle r={dimensions.innerDiameterMm / 2} className={`plate-opening${activeKey === 'innerDiameterMm' ? ' plate-active' : ''}`} />
    {guide && <><circle r={dimensions.speaker.pitchDiameterMm / 2} className="plate-pitch speaker-pitch" /><circle r={dimensions.vehicle.pitchDiameterMm / 2} className="plate-pitch vehicle-pitch" /></>}
    {holes.map((hole, i) => <circle key={i} cx={hole.x} cy={-hole.y} r={hole.radius} className={`${hole.group === 'speaker' ? 'speaker-hole' : 'vehicle-hole'}${activeKey?.startsWith(hole.group) ? ' plate-active' : ''}`} />)}
    {guide && <><path d={`M ${-radius} 0 H ${radius}`} className="plate-measure-line" /><path d={`M 0 ${-dimensions.innerDiameterMm / 2} V ${dimensions.innerDiameterMm / 2}`} className="plate-measure-line" /></>}
  </svg>;
}

export default function PlateDesigner() {
  const [dimensions, setDimensions] = useState<PlateDimensions>(example);
  const [unit, setUnit] = useState<MeasurementUnit>('mm');
  const [size, setSize] = useState('');
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [artifact, setArtifact] = useState<ReturnType<typeof createPlateArtifact> | null>(null);
  const [error, setError] = useState('');
  const [haveParts, setHaveParts] = useState('unsure');
  const [measurementMode, setMeasurementMode] = useState<'guided' | 'full'>('guided');
  const [guidanceStarted, setGuidanceStarted] = useState(false);
  const [guidanceIndex, setGuidanceIndex] = useState(0);
  const [answers, setAnswers] = useState<GuidanceAnswers>({});
  const [edited, setEdited] = useState<string[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => ({ outerDiameterMm: '200', innerDiameterMm: '120', thicknessMm: '6', speakerCount: '4', speakerPitch: '150', speakerHole: '4', speakerRotation: '0', vehicleCount: '4', vehiclePitch: '180', vehicleHole: '5', vehicleRotation: '45' }));
  function edit(key: string, value: string, change: (d: PlateDimensions, numeric: number) => PlateDimensions, dimensional = true) {
    setValues(previous => ({ ...previous, [key]: value }));
    setEdited(previous => previous.includes(key) ? previous : [...previous, key]);
    setAnswers(previous => ({ ...previous, [key]: undefined }));
    const numeric = value.trim() ? Number(value) : NaN;
    setDimensions(previous => change(previous, dimensional ? toMillimeters(numeric, unit) : numeric));
    setArtifact(null); setError('');
  }
  function changeUnit(next: MeasurementUnit) {
    const d = dimensions;
    setValues(previous => ({ ...previous, ...Object.fromEntries(([['outerDiameterMm', d.outerDiameterMm], ['innerDiameterMm', d.innerDiameterMm], ['thicknessMm', d.thicknessMm], ['speakerPitch', d.speaker.pitchDiameterMm], ['speakerHole', d.speaker.holeDiameterMm], ['vehiclePitch', d.vehicle.pitchDiameterMm], ['vehicleHole', d.vehicle.holeDiameterMm]] as const).map(([key, value]) => [key, Number.isFinite(value) ? formatMeasurement(value, next) : previous[key]])) }));
    setUnit(next);
  }
  function field(key: DimensionKey, label: string, help: string) {
    return <div className="field"><label htmlFor={`plate-${key}`}>{label} <span>{unit}</span></label><input id={`plate-${key}`} type="number" step="any" value={values[key]} onChange={e => edit(key, e.target.value, (d, n) => ({ ...d, [key]: n }))} /><p className="field-help">{help}</p></div>;
  }
  function patternField(group: 'speaker' | 'vehicle', key: PatternKey, valueKey: string, label: string, help: string, dimensional: boolean) {
    const id = `plate-${group}-${valueKey}`, name = `${group}${valueKey}`;
    return <div className="field"><label htmlFor={id}>{label} <span>{dimensional ? unit : key === 'rotationDeg' ? 'degrees' : ''}</span></label><input id={id} type="number" step={key === 'count' ? '1' : 'any'} value={values[name]} onChange={e => edit(name, e.target.value, (d, n) => ({ ...d, [group]: { ...d[group], [key]: n } }), dimensional)} /><p className="field-help">{help}</p></div>;
  }
  function generate() {
    if (size.includes('×')) { setArtifact(null); setError('This first version supports round speakers only. An oval speaker needs a custom consultation.'); return; }
    if ((measurementMode === 'guided' || guidanceStarted) && missingGuidanceAnswers(answers).length) { setArtifact(null); setError('Confirm each measurement before creating a download, or contact us for help with the missing details.'); return; }
    try { validatePlateDimensions(dimensions); setArtifact(createPlateArtifact(dimensions)); setError(''); setStage(3); }
    catch (caught) { setArtifact(null); setError(msg(caught)); }
  }
  function download() {
    if (!artifact) return;
    const url = URL.createObjectURL(new Blob([artifact.bytes as BlobPart], { type: 'model/stl' }));
    const a = document.createElement('a'); a.href = url; a.download = 'HIS_speaker_mounting_plate_mm.stl'; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function guidedEdit(key: GuidanceKey, value: string) {
    if (key === 'outerDiameterMm' || key === 'innerDiameterMm' || key === 'thicknessMm') {
      edit(key, value, (d, n) => ({ ...d, [key]: n })); return;
    }
    const group = key.startsWith('speaker') ? 'speaker' : 'vehicle';
    const suffix = key.slice(group.length);
    const property: PatternKey = suffix === 'Count' ? 'count' : suffix === 'Pitch' ? 'pitchDiameterMm' : suffix === 'Hole' ? 'holeDiameterMm' : 'rotationDeg';
    edit(key, value, (d, n) => ({ ...d, [group]: { ...d[group], [property]: n } }), suffix === 'Pitch' || suffix === 'Hole');
  }
  function answerStep(answer: 'confirmed' | 'help') {
    const step = guidanceSteps[guidanceIndex];
    const raw = values[step.key];
    const value = Number(raw);
    if (answer === 'confirmed' && (!raw.trim() || !Number.isFinite(value) || (step.key.endsWith('Count') ? !Number.isInteger(value) || value < 1 || value > 12 : !step.key.endsWith('Rotation') && value <= 0))) { setError('Enter a valid measurement, or choose “I need help.”'); return; }
    setGuidanceStarted(true); setAnswers(previous => updateGuidanceAnswer(previous, step.key, answer)); setError(''); setArtifact(null);
    setGuidanceIndex(previous => Math.min(previous + 1, guidanceSteps.length));
  }
  const missing = missingGuidanceAnswers(answers);
  const contactSummary = buildPlateContactSummary({ size, haveParts, unit, values, answers, edited, guided: measurementMode === 'guided' || guidanceStarted });
  const contactMessage = `${contactSummary}${contactNote.trim() ? `\n\nCustomer notes:\n${contactNote.trim()}` : ''}`;
  async function copyProjectDetails() {
    try { await navigator.clipboard.writeText(contactMessage); setCopyStatus('Project details copied. Paste them into the message on the contact page.'); }
    catch { setCopyStatus('Copy was unavailable. Select and copy the project details below.'); }
  }
  async function openContactForm() {
    if (contactSending) return;
    const details = { name: contactName.trim(), email: contactEmail.trim(), subject: 'Speaker mounting plate inquiry', message: contactMessage };
    const problem = validateContact(details);
    if (problem) { setCopyStatus(problem); return; }
    setContactSending(true); setCopyStatus('Sending your message…');
    try { await sendContact(details); setCopyStatus('Your message was submitted. Thank you!'); }
    catch (error) { setCopyStatus(error instanceof Error && error.message === 'uncertain' ? 'We could not confirm whether your message was sent. Please contact us before trying again to avoid a duplicate.' : 'Your message could not be sent. Your details are still here; please try again or use the contact page.'); }
    finally { setContactSending(false); }
  }
  function contactPreview() {
    return <div className="contact-preview"><h3>Tell us about your project</h3><p>Your project details are included below. Review them, then send your message to us here.</p><div className="contact-fields"><label>Name<input type="text" maxLength={120} value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" /></label><label>Email<input type="email" maxLength={254} value={contactEmail} onChange={e => setContactEmail(e.target.value)} autoComplete="email" /></label></div><label>Anything else we should know?<textarea rows={3} maxLength={2500} value={contactNote} onChange={e => setContactNote(e.target.value)} /></label><label>Project details<textarea rows={10} value={contactMessage} readOnly /></label><div className="guide-actions"><button type="button" className="primary" disabled={contactSending} onClick={openContactForm}>{contactSending ? 'Sending…' : 'Send message'}</button><button type="button" onClick={copyProjectDetails}>Copy project details</button></div><p role="status">{copyStatus}</p><p>If you need another way to reach us, copy these details and paste them into the message on Hall’s contact page.</p></div>;
  }
  let previewDimensions: PlateDimensions | null = null;
  try { validatePlateDimensions(dimensions); previewDimensions = dimensions; } catch { /* Show no misleading preview for incomplete values. */ }
  return <section className="plate-designer">
    <div className="lab-page-heading"><span className="lab-kicker">SPEAKER MOUNTING PLATE</span><h2>Make a plate for your speaker</h2><p>Connect a round speaker and a round factory opening with two circular screw patterns.</p></div>
    <nav className="design-steps" aria-label="Mounting plate steps"><button type="button" aria-current={stage === 1 ? 'step' : undefined} onClick={() => setStage(1)}>1. Your speaker</button><button type="button" aria-current={stage === 2 ? 'step' : undefined} onClick={() => setStage(2)}>2. Measurements</button><button type="button" aria-current={stage === 3 ? 'step' : undefined} disabled={!artifact} onClick={() => setStage(3)}>3. Review &amp; download</button></nav>
    <p className="notice"><strong>Measurements start with an example.</strong> Check every measurement against your speaker and vehicle before using this design.</p>
    {stage === 1 && <div className="ring-guidance"><h2>What size speaker are you installing?</h2><label htmlFor="plate-speaker-size">Speaker size</label><select id="plate-speaker-size" value={size} onChange={e => { setSize(e.target.value); setArtifact(null); setAnswers({}); setEdited([]); setGuidanceIndex(0); setGuidanceStarted(false); setError(''); }}><option value="">Choose a size or skip for now</option>{speakerSizes.map(s => <option key={s}>{s}</option>)}</select><p>Speaker sizes are product labels. Enter the actual dimensions from your parts or their templates; choosing a size does not fill in a mounting pattern.</p><label htmlFor="plate-have-parts">What do you have available to measure?</label><select id="plate-have-parts" value={haveParts} onChange={e => setHaveParts(e.target.value)}><option value="unsure">I’m not sure yet</option><option value="both">My speaker and the factory part</option><option value="speaker">My speaker</option><option value="factory">The factory part</option><option value="neither">Neither yet</option></select><p>You can continue even if you don’t have everything. We’ll note where you need help.</p><p>This first version supports a round speaker, round opening, and evenly spaced holes. Oval speakers and irregular vehicle patterns need a custom consultation; they are not generated here yet.</p>{size.includes('×') && <p className="notice">This is an oval size. The current designer can’t make its opening yet. <a href="https://hallintegratedsystems.com/contact.html" target="_blank" rel="noopener noreferrer">Contact Hall for help</a>.</p>}<button className="primary" type="button" onClick={() => setStage(2)}>Continue to measurements</button></div>}
    {stage === 2 && <div className="plate-layout"><div>
      <div className="design-steps" aria-label="Choose how to enter measurements"><button type="button" aria-pressed={measurementMode === 'guided'} onClick={() => { setMeasurementMode('guided'); setError(''); }}>Guide me</button><button type="button" aria-pressed={measurementMode === 'full'} onClick={() => { setMeasurementMode('full'); setError(''); }}>Show all measurements</button></div>
      <section className="dimensions"><label htmlFor="plate-unit">Measurement unit</label><select id="plate-unit" value={unit} onChange={e => changeUnit(e.target.value as MeasurementUnit)}><option value="mm">Millimeters (mm)</option><option value="cm">Centimeters (cm)</option><option value="in">Inches (in)</option></select><p className="field-help">Switch units at any time. Enter inch fractions as decimals.</p></section>
      {measurementMode === 'guided' && <section className="dimensions plate-pattern" aria-live="polite">{guidanceIndex < guidanceSteps.length ? (() => { const step = guidanceSteps[guidanceIndex]; const isRotation = step.key.endsWith('Rotation'); const isCount = step.key.endsWith('Count'); return <><p className="field-help">Measurement {guidanceIndex + 1} of {guidanceSteps.length}</p><h2>{step.title}</h2><p className="muted">{step.help}</p><div className="field"><label htmlFor="guided-measurement">{step.label} <span>{isCount ? '' : isRotation ? 'degrees' : unit}</span></label><input id="guided-measurement" type="number" step={isCount ? '1' : 'any'} value={values[step.key]} onChange={e => guidedEdit(step.key, e.target.value)} /><p className="field-help">The displayed value may be an example. Confirm only after checking your part.</p></div>{error && <p className="error" role="alert">{error}</p>}<div className="guide-actions"><button className="primary" type="button" onClick={() => answerStep('confirmed')}>This measurement is correct</button><button type="button" onClick={() => answerStep('help')}>I need help with this</button>{guidanceIndex > 0 && <button type="button" onClick={() => { setGuidanceIndex(guidanceIndex - 1); setError(''); }}>Back</button>}{guidanceStarted && <button type="button" onClick={() => { setGuidanceIndex(guidanceSteps.length); setError(''); }}>Review all answers</button>}</div></>; })() : <><h2>Review your measurements</h2><p>Available to measure: {({ unsure: 'Not sure yet', both: 'Speaker and factory part', speaker: 'Speaker', factory: 'Factory part', neither: 'Neither yet' } as Record<string, string>)[haveParts]}.</p><dl>{guidanceSteps.map((step, index) => <div key={step.key}><dt>{step.label}</dt><dd>{answers[step.key] === 'confirmed' ? `${values[step.key]}${step.key.endsWith('Count') ? '' : step.key.endsWith('Rotation') ? '°' : ` ${unit}`}` : answers[step.key] === 'help' ? 'Needs help' : 'Not confirmed'} <button type="button" onClick={() => setGuidanceIndex(index)}>Change</button></dd></div>)}</dl>{missing.length ? <><p>These details still need your attention before a plate can be downloaded:</p><ul>{missing.map(key => <li key={key}>{guidanceSteps.find(step => step.key === key)?.label} {answers[key] === 'help' ? '— help requested' : '— not confirmed'}</li>)}</ul><p>You can go back to enter them or ask Hall for help.</p>{contactPreview()}</> : <p>You’ve confirmed all measurements. You can review your plate next.</p>}<div className="guide-actions"><button type="button" onClick={() => setGuidanceIndex(0)}>Review measurements again</button>{!missing.length && <button className="primary" type="button" onClick={generate}>See my plate</button>}</div>{error && <p className="error" role="alert">{error}</p>}</>}</section>}
      {measurementMode === 'full' && <><section className="dimensions plate-pattern"><h2>Plate measurements</h2>
        {field('outerDiameterMm', 'Outside diameter', 'Full width across the plate through its center.')}
        {field('innerDiameterMm', 'Opening diameter', 'Width of the centered opening through its center.')}
        {field('thicknessMm', 'Plate thickness', 'Distance from the flat bottom to the top. Starting design range: 3–25 mm; strength and fit require testing.')}
      </section>
      {(['speaker', 'vehicle'] as const).map(group => <section className="dimensions plate-pattern" key={group}><h2>{group === 'speaker' ? 'Speaker screws' : 'Vehicle factory screws'}</h2><p className="field-help">Measure the actual hole centers and hardware for this side. These are separate patterns.</p>
        {patternField(group, 'count', 'Count', 'Number of holes', 'Whole number from 1 to 12, evenly spaced.', false)}
        {patternField(group, 'pitchDiameterMm', 'Pitch', 'Circle through hole centers', 'Diameter of the circle passing through the centers of these holes, not the distance around it.', true)}
        {patternField(group, 'holeDiameterMm', 'Hole', 'Hole diameter', 'Enter the opening size you need for this hardware. No automatic screw clearance is added.', true)}
        {patternField(group, 'rotationDeg', 'Rotation', 'Pattern rotation', 'Looking from the speaker-facing side, zero puts the first hole to the right; positive angles turn counterclockwise. Measure both patterns from this same side and reference.', false)}
      </section>)}
      {guidanceStarted && missing.length > 0 && <p className="notice">The guided walkthrough has unconfirmed details. Return to it to confirm each measurement or request help before downloading.</p>}
      {error && <p className="error" role="alert">{error}</p>}<button className="primary" type="button" onClick={generate}>See my plate</button></>}
      <p className={Number.isFinite(dimensions.outerDiameterMm) && dimensions.outerDiameterMm > 320 ? 'error' : 'field-help plate-size-note'}>{Number.isFinite(dimensions.outerDiameterMm) && dimensions.outerDiameterMm > 320 ? 'This plate is larger than our current 320 mm one-piece limit. Let’s discuss options for larger designs.' : 'One-piece plates: up to 320 mm across. For larger designs, let’s discuss your options.'}</p>
      </div><aside className="ring-guidance plate-guide"><h2>Where to measure</h2>{previewDimensions ? <><PlateDiagram dimensions={previewDimensions} guide activeKey={measurementMode === 'guided' ? guidanceSteps[guidanceIndex]?.key : undefined} /><p>Illustration updates as valid measurements change. Example values remain until you replace them.</p></> : <p>Enter compatible measurements to see your plate diagram.</p>}{measurementMode === 'guided' && guidanceSteps[guidanceIndex]?.key === 'thicknessMm' && <div className="plate-side-view"><svg viewBox="0 0 260 70" role="img" aria-label="Side view of a plate showing thickness from bottom to top"><rect x="20" y="20" width="180" height="30" className="plate-outline" /><path d="M 214 20 V 50 M 209 20 H 219 M 209 50 H 219" className="plate-measure-line" /><text x="20" y="66">Side view · thickness</text></svg></div>}<p><strong>White:</strong> outside diameter and opening diameter, measured across the center.</p><p><strong>Blue:</strong> speaker holes and the circle through their centers. <strong>Gold:</strong> vehicle holes and their circle.</p><p>Measure thickness from bottom to top. Check front clearance behind the door panel and rear clearance to the window and vehicle parts. This tool does not check screw length, countersinks, threads, material strength, or fit.</p></aside></div>}
    {stage === 3 && artifact && <div className="design-review"><div className="review-intro"><h2>Your plate is ready to review</h2><p>Top view: blue marks speaker holes; gold marks vehicle holes. These are through-holes in a flat, round plate.</p></div><div className="plate-review-diagram"><PlateDiagram dimensions={dimensions} /></div><p>Viewed from the speaker-facing side. Positive rotation is counterclockwise.</p><dl>{(['speaker', 'vehicle'] as const).map(group => <div key={group}><dt>{group === 'speaker' ? 'Speaker' : 'Vehicle'} pattern</dt><dd>{dimensions[group].count} holes · circle Ø {dimensions[group].pitchDiameterMm.toFixed(2)} mm · hole Ø {dimensions[group].holeDiameterMm.toFixed(2)} mm · {dimensions[group].rotationDeg}°</dd></div>)}</dl><p>Outside Ø {dimensions.outerDiameterMm.toFixed(2)} mm · opening Ø {dimensions.innerDiameterMm.toFixed(2)} mm · thickness {dimensions.thicknessMm.toFixed(2)} mm · {artifact.report.holeCount} mounting holes</p>{dimensions.outerDiameterMm > 320 && <p className="error">This plate exceeds our current 320 mm one-piece limit. Let’s discuss options for larger designs.</p>}<p className="notice">Software geometry checks passed for this model and its STL. This does not confirm the real speaker, vehicle, hardware, material, print strength, or fit. Inspect the file in your slicer and check a printed part against the actual installation before use. Circular openings are made of straight segments and are slightly smaller across their flats; no fit allowance is added.</p><div className="next-steps"><h2>Next steps</h2><p>Download the model if you want to inspect it. STL is a common slicer model format; import it as millimeters at 100% scale.</p><button type="button" className="primary" onClick={download}>Download plate model (STL)</button><p>Need help with a larger part or an irregular factory pattern? A consultation can help determine the next step.</p>{contactPreview()}</div></div>}
  </section>;
}
