import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { RingDimensions } from './geometry.ts';
import { createInspection, differenceMm, parseInspection, parseReadings, serializeInspection } from './inspection.ts';
import type { FitStatus, InspectionFeature, RingInspection } from './inspection.ts';

interface SourceRing { name: string; dimensions: RingDimensions }
interface Props { source: SourceRing | null }
interface Draft {
  partName: string;
  recordedOn: string;
  nominal: RingDimensions;
  readingsText: Record<InspectionFeature, string>;
  acceptedMeasurements: InspectionFeature[];
  fitStatus: FitStatus;
  fitNote: string;
  note: string;
}

const features: Array<{ key: InspectionFeature; label: string }> = [
  { key: 'outerDiameterMm', label: 'Outside diameter' },
  { key: 'innerDiameterMm', label: 'Opening diameter' },
  { key: 'thicknessMm', label: 'Thickness' },
];
const fmt = (value: number) => value.toFixed(2);
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${fmt(Math.abs(value))}`;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Inspection could not be processed.';

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function fromRecord(record: RingInspection): Draft {
  return {
    partName: record.partName, recordedOn: record.recordedOn, nominal: { ...record.nominal },
    readingsText: {
      outerDiameterMm: record.readings.outerDiameterMm.join(', '),
      innerDiameterMm: record.readings.innerDiameterMm.join(', '),
      thicknessMm: record.readings.thicknessMm.join(', '),
    },
    acceptedMeasurements: [...record.acceptedMeasurements], fitStatus: record.fit.status,
    fitNote: record.fit.note, note: record.note,
  };
}

function downloadInspection(data: string, partName: string) {
  const safeName = partName.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'ring';
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${safeName}.his-inspection.json`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function InspectionPanel({ source }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);

  function update(change: (previous: Draft) => Draft, message = 'Inspection draft changed. Save a new record when ready.') {
    revision.current++;
    setDraft(previous => previous ? change(previous) : previous);
    setError(''); setStatus(message);
  }

  function startFromCurrent() {
    if (!source) return;
    if (draft && !window.confirm('Replace the current inspection draft? Save it first if you need it.')) return;
    revision.current++;
    setDraft({
      partName: source.name, recordedOn: localDate(), nominal: { ...source.dimensions },
      readingsText: { outerDiameterMm: '', innerDiameterMm: '', thicknessMm: '' },
      acceptedMeasurements: [], fitStatus: 'not-checked', fitNote: '', note: '',
    });
    setError(''); setStatus('Inspection started from the current validated ring. Enter physical readings below.');
  }

  function editReadings(key: InspectionFeature, value: string) {
    update(previous => ({
      ...previous,
      readingsText: { ...previous.readingsText, [key]: value },
      // A changed measurement needs a fresh owner decision.
      acceptedMeasurements: previous.acceptedMeasurements.filter(feature => feature !== key),
    }), 'Reading changed; acceptance for this dimension cleared. Review the decision note before saving.');
  }

  function toggleAccepted(key: InspectionFeature, checked: boolean) {
    update(previous => ({
      ...previous,
      acceptedMeasurements: checked
        ? [...previous.acceptedMeasurements, key]
        : previous.acceptedMeasurements.filter(feature => feature !== key),
    }));
  }

  function makeRecord(): RingInspection {
    if (!draft) throw new Error('Start or load an inspection first.');
    return createInspection({
      partName: draft.partName, recordedOn: draft.recordedOn, nominal: draft.nominal,
      readings: {
        outerDiameterMm: parseReadings(draft.readingsText.outerDiameterMm),
        innerDiameterMm: parseReadings(draft.readingsText.innerDiameterMm),
        thicknessMm: parseReadings(draft.readingsText.thicknessMm),
      },
      acceptedMeasurements: draft.acceptedMeasurements,
      fit: { status: draft.fitStatus, note: draft.fitNote }, note: draft.note,
    });
  }

  function save() {
    try {
      const record = makeRecord();
      downloadInspection(serializeInspection(record), record.partName);
      setError(''); setStatus('Inspection JSON downloaded. Nominal geometry and export files were not changed.');
    } catch (caught) { setError(errorMessage(caught)); setStatus(''); }
  }

  async function load(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const before = revision.current;
    try {
      if (file.size > 64 * 1024) throw new Error('Inspection exceeds 64 KiB UTF-8 size limit.');
      const json = await file.text();
      if (before !== revision.current) throw new Error('The inspection draft changed while the file was loading. Select it again.');
      const record = parseInspection(json);
      revision.current++;
      setDraft(fromRecord(record)); setError('');
      setStatus('Inspection loaded. Its nominal dimensions are a saved snapshot; the current model was not changed.');
    } catch (caught) { setError(errorMessage(caught)); setStatus('Inspection was not loaded; the current draft remains available.'); }
    finally { input.value = ''; }
  }

  return <section className="inspection-panel" aria-label="As-built inspection">
    <div className="section-heading"><h2>As-built inspection</h2><span className="muted">Separate local record</span></div>
    <p className="muted">Record physical caliper readings and owner decisions for one part. This inspection never changes the nominal model, saved dimension project, STL, or 3MF.</p>
    <div className="inspection-actions">
      <button type="button" onClick={startFromCurrent} disabled={!source}>Start from current validated ring</button>
      <button type="button" onClick={() => fileInput.current?.click()}>Load inspection JSON</button>
      <input ref={fileInput} className="file-input" type="file" accept=".his-inspection.json,application/json" aria-label="Choose inspection JSON" onChange={load} />
    </div>
    {!draft ? <p className="field-help">Start from a generated ring, or load a prior inspection. The 150/130/6 blue-print example is a separate record, not part of the default 180/145/12 demo.</p> : <>
      <div className="inspection-meta">
        <div><label htmlFor="inspection-name">Part name</label><input id="inspection-name" type="text" maxLength={120} value={draft.partName} onChange={event => update(previous => ({ ...previous, partName: event.target.value }))} /></div>
        <div><label htmlFor="inspection-date">Record date</label><input id="inspection-date" type="date" value={draft.recordedOn} onChange={event => update(previous => ({ ...previous, recordedOn: event.target.value }))} /></div>
      </div>
      <p className="field-help">Nominal snapshot: Ø{fmt(draft.nominal.outerDiameterMm)} outside · Ø{fmt(draft.nominal.innerDiameterMm)} opening · {fmt(draft.nominal.thicknessMm)} thick, in mm.</p>
      <div className="inspection-grid">
        {features.map(({ key, label }) => {
          let values: number[] = [];
          let readingError = '';
          try { values = parseReadings(draft.readingsText[key]); }
          catch (caught) { readingError = errorMessage(caught); }
          return <div className="inspection-feature" key={key}>
            <label htmlFor={`inspection-${key}`}>{label} <span>mm</span></label>
            <textarea id={`inspection-${key}`} rows={2} value={draft.readingsText[key]} placeholder="Enter one or more readings" onChange={event => editReadings(key, event.target.value)} aria-describedby={`inspection-${key}-help`} />
            <p id={`inspection-${key}-help`} className="field-help">Separate repeated readings with commas or new lines. Nominal: {fmt(draft.nominal[key])} mm.</p>
            {readingError ? <p className="error">{readingError}</p> : values.length ? <p className="inspection-deltas">{values.map((value, index) => <span key={index}>{fmt(value)} mm ({signed(differenceMm(value, draft.nominal[key]))} mm)</span>)}</p> : <p className="field-help">No physical reading recorded.</p>}
            <label className="inspection-accept"><input type="checkbox" checked={draft.acceptedMeasurements.includes(key)} disabled={!values.length || !!readingError} onChange={event => toggleAccepted(key, event.target.checked)} />Owner accepts these measured values for this prototype</label>
          </div>;
        })}
      </div>
      <div className="inspection-meta">
        <div><label htmlFor="inspection-fit">Mating-part fit</label><select id="inspection-fit" value={draft.fitStatus} onChange={event => update(previous => ({ ...previous, fitStatus: event.target.value as FitStatus }))}><option value="not-checked">Not checked</option><option value="acceptable">Acceptable</option><option value="unacceptable">Unacceptable</option></select></div>
        <div><label htmlFor="inspection-fit-note">Fit note</label><input id="inspection-fit-note" type="text" maxLength={500} value={draft.fitNote} onChange={event => update(previous => ({ ...previous, fitNote: event.target.value }))} placeholder="Part and contact observed" /></div>
      </div>
      <div className="inspection-note"><label htmlFor="inspection-note">Decision and evidence note</label><textarea id="inspection-note" rows={3} maxLength={1000} value={draft.note} onChange={event => update(previous => ({ ...previous, note: event.target.value }))} placeholder="Who accepted which readings, for what prototype, and what is still open?" /><p className="field-help">Required when accepting a measured value. A fit decision also needs a fit note. This record does not assign a general manufacturing tolerance or automatic pass.</p></div>
      <button type="button" className="primary inspection-save" onClick={save}>Download inspection JSON</button>
    </>}
    {error ? <p className="error" role="alert">{error}</p> : null}
    {status ? <p className="status" role="status">{status}</p> : null}
  </section>;
}
