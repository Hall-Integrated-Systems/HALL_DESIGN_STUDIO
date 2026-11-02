import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { DEMO_DIMENSIONS } from './geometry.ts';
import type { RingDimensions } from './geometry.ts';
import type { Artifact } from './export.ts';
import { RingWorkflow } from './exportWorkflow.ts';
import type { ExportFormat, ExportReport } from './integrity.ts';
import type { RingProject } from './project.ts';
import PhotoMeasurePanel from './PhotoMeasurePanel.tsx';
import InspectionPanel from './InspectionPanel.tsx';
import { RingGuidance } from './RingGuidance.tsx';
import type { RingUse } from './RingGuidance.tsx';
import { formatMeasurement, fromMillimeters, ringBuildSize, toMillimeters } from './unitsAndSize.ts';
import type { MeasurementUnit } from './unitsAndSize.ts';
import PlateDesigner from './PlateDesigner.tsx';
import RingContact from './RingContact.tsx';
import { buildRingContactSummary } from './ringContact.ts';

const Preview = lazy(() => import('./Preview.tsx'));
const DEMO_NAME = 'HIS Spacer Ring Demo';
const fields: Array<{ key: keyof RingDimensions; label: string; help: string; min: number; max: number }> = [
  { key: 'outerDiameterMm', label: 'Outside diameter', help: 'Full width across the outside of the ring.', min: 2, max: 1000 },
  { key: 'innerDiameterMm', label: 'Opening diameter', help: 'Full width across the central opening.', min: 1, max: 999.6 },
  { key: 'thicknessMm', label: 'Thickness', help: 'Distance from the flat bottom to the top.', min: 0.2, max: 250 },
];
const inputsFor = (dimensions: RingDimensions) => Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, String(value)])) as Record<keyof RingDimensions, string>;
const displayInputsFor = (dimensions: RingDimensions, unit: MeasurementUnit) => Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, formatMeasurement(value, unit)])) as Record<keyof RingDimensions, string>;
function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const f = (n: number, places = 4) => n.toLocaleString('en-US', { maximumFractionDigits: places });
const message = (error: unknown) => error instanceof Error ? error.message : 'Operation failed.';
export function photoFieldFromNote(note: string | undefined): keyof RingDimensions | null {
  if (!note) return null;
  return fields.find(field => note.split('\n').some(line => line.startsWith(`User-confirmed provisional photo proposal for ${field.label} from `)))?.key ?? null;
}
export function withoutPhotoNote(note: string | undefined): string | undefined {
  if (!note) return undefined;
  return note.split('\n').filter(line => !photoFieldFromNote(line)).join('\n') || undefined;
}
type LabPage = 'start' | 'design' | 'measure' | 'inspect' | 'plate';
const labGoals: Array<{ id: Exclude<LabPage, 'start'>; number: string; title: string; description: string; action: string }> = [
  { id: 'design', number: '01', title: 'Create a spacer ring', description: 'Set precise dimensions, inspect the 3D model, and download checked geometry.', action: 'Open ring designer' },
  { id: 'measure', number: '02', title: 'Measure from a photo', description: 'Use a known reference to propose a dimension before building the ring.', action: 'Open photo tool' },
  { id: 'inspect', number: '03', title: 'Check a printed part', description: 'Record caliper readings and fit decisions beside the nominal design.', action: 'Open inspection' },
  { id: 'plate', number: '04', title: 'Make a speaker mounting plate', description: 'Connect a round speaker to a round factory opening using two screw patterns.', action: 'Open plate designer' },
];
function pageFromLocation(): LabPage {
  const hash = window.location.hash.slice(1);
  return hash === 'design' || hash === 'measure' || hash === 'inspect' || hash === 'plate' ? hash : 'start';
}

export default function App({ studioHref }: { studioHref?: string }) {
  const [workflow] = useState(() => new RingWorkflow());
  const fileInput = useRef<HTMLInputElement>(null);
  const [inputs, setInputs] = useState(() => inputsFor(DEMO_DIMENSIONS));
  const [unit, setUnit] = useState<MeasurementUnit>('mm');
  const unitRef = useRef<MeasurementUnit>('mm');
  const [displayInputs, setDisplayInputs] = useState(() => displayInputsFor(DEMO_DIMENSIONS, 'mm'));
  const [name, setName] = useState(DEMO_NAME);
  const [origin, setOrigin] = useState<RingProject['provenance']['origin']>('demo');
  const [note, setNote] = useState<string | undefined>();
  const [artifact, setArtifact] = useState<Artifact | null>(() => workflow.artifact);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Demo geometry generated and STL checked.');
  const [busy, setBusy] = useState('');
  const [lastReport, setLastReport] = useState<ExportReport | null>(null);
  const [lastDownloadWasReport, setLastDownloadWasReport] = useState(false);
  const [page, setPage] = useState<LabPage>(pageFromLocation);
  const [ringUse, setRingUse] = useState<RingUse>('');
  const [designStep, setDesignStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const syncPage = () => setPage(pageFromLocation());
    window.addEventListener('popstate', syncPage);
    window.addEventListener('hashchange', syncPage);
    return () => { window.removeEventListener('popstate', syncPage); window.removeEventListener('hashchange', syncPage); };
  }, []);

  function openPage(next: LabPage) {
    if (next !== page) {
      const hash = next === 'start' ? '' : `#${next}`;
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
      setPage(next);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function editDimension(key: keyof RingDimensions, value: string) {
    workflow.edit();
    setDisplayInputs(previous => ({ ...previous, [key]: value }));
    setInputs(previous => ({ ...previous, [key]: value.trim() ? String(toMillimeters(Number(value), unit)) : '' }));
    setArtifact(null); setOrigin('user-entered'); setNote(previous => photoFieldFromNote(previous) === key ? withoutPhotoNote(previous) : previous); setLastReport(null); setError('');
    setStatus('Measurements changed. Generate a new ring to enable export.');
  }
  function changeUnit(next: MeasurementUnit) {
    unitRef.current = next;
    setDisplayInputs(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, value.trim() && Number.isFinite(Number(value)) ? formatMeasurement(Number(value), next) : value])) as Record<keyof RingDimensions, string>);
    setUnit(next);
  }
  function editName(value: string) {
    workflow.rename();
    setName(value); setArtifact(null); setOrigin('user-entered'); setLastReport(null); setError('');
    setStatus('Project name changed. Generate again to enable export.');
  }
  function usePhotoEstimate(key: keyof RingDimensions, valueMm: number, provenanceNote: string) {
    const previousPhotoField = photoFieldFromNote(note);
    if (previousPhotoField && previousPhotoField !== key) {
      setError('Review and re-enter the previous photo-derived measurement before using a photo estimate for another dimension.');
      setDesignStep(2);
      openPage('design');
      return;
    }
    const existingNote = withoutPhotoNote(note);
    const combinedNote = existingNote ? `${existingNote}\n${provenanceNote}` : provenanceNote;
    if (Array.from(combinedNote).length > 1000) {
      setError('The saved project note is too long to add this photo estimate. Its existing note and measurements were kept.');
      setDesignStep(2);
      openPage('design');
      return;
    }
    workflow.edit();
    setInputs(previous => ({ ...previous, [key]: String(valueMm) }));
    setDisplayInputs(previous => ({ ...previous, [key]: formatMeasurement(valueMm, unit) }));
    setArtifact(null); setOrigin('user-entered'); setNote(combinedNote); setLastReport(null); setError('');
    setStatus('Photo estimate placed in the dimension input. Review it, then choose See my ring.');
    setDesignStep(2);
    openPage('design');
  }
  function generate(event: FormEvent) {
    event.preventDefault();
    try {
      if (Object.values(inputs).some(value => !value.trim())) throw new Error('Enter all three dimensions in millimeters.');
      const dimensions: RingDimensions = {
        outerDiameterMm: Number(inputs.outerDiameterMm),
        innerDiameterMm: Number(inputs.innerDiameterMm),
        thicknessMm: Number(inputs.thicknessMm),
      };
      workflow.generate(dimensions, name, origin, note);
      setArtifact(workflow.artifact); setError(''); setLastReport(null);
      setStatus('Source geometry and binary STL passed automated checks. 3MF native-app import remains pending.');
      setDesignStep(3);
    } catch (caught) { setArtifact(null); setError(message(caught)); setStatus(''); }
  }
  function restoreDemo() {
    workflow.generate(DEMO_DIMENSIONS, DEMO_NAME, 'demo');
    setInputs(inputsFor(DEMO_DIMENSIONS)); setName(DEMO_NAME); setOrigin('demo'); setNote(undefined);
    setDisplayInputs(displayInputsFor(DEMO_DIMENSIONS, unit));
    setArtifact(workflow.artifact); setLastReport(null); setError('');
    setStatus('Demo dimensions restored and STL checked.');
  }
  function saveProject() {
    try {
      const data = workflow.saveProject();
      download(data, `${workflow.artifact!.baseName}.his-ring.json`, 'application/json');
      setError(''); setStatus('Dimension project saved as portable JSON.');
    } catch (caught) { setError(message(caught)); }
  }
  async function loadProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const revision = workflow.revision();
    try {
      if (file.size > 64 * 1024) throw new Error('Project exceeds 64 KiB UTF-8 size limit.');
      const json = await file.text();
      if (workflow.revision() !== revision) throw new Error('Inputs changed while the project was loading. Select it again.');
      workflow.loadProject(json);
      setInputs(inputsFor(workflow.project.dimensions)); setName(workflow.project.name);
      setDisplayInputs(displayInputsFor(workflow.project.dimensions, unitRef.current));
      setOrigin(workflow.project.provenance.origin); setNote(workflow.project.provenance.note);
      setArtifact(workflow.artifact); setLastReport(null); setError('');
      setDesignStep(3);
      setStatus('Project loaded; geometry regenerated and STL revalidated from its dimensions.');
    } catch (caught) {
      setError(message(caught));
      setStatus('Project was not loaded; the current ring remains available.');
    }
  }
  async function exportFormat(format: ExportFormat, reportOnly: boolean) {
    setBusy(format); setError('');
    try {
      const prepared = await workflow.prepareExport(format);
      if (!workflow.isCurrent(prepared.revision)) throw new Error('Inputs changed while the export was pending. Generate again.');
      if (reportOnly) download(JSON.stringify(prepared.report, null, 2) + '\n', prepared.reportFilename, 'application/json');
      else download(prepared.bytes, prepared.filename, format === 'stl' ? 'model/stl' : 'model/3mf');
      setLastReport(prepared.report);
      setLastDownloadWasReport(reportOnly);
      setStatus(`${format.toUpperCase()} ${reportOnly ? 'report' : 'geometry'} downloaded · ${prepared.report.byteLength.toLocaleString()} bytes · SHA-256 ${prepared.report.sha256}.`);
    } catch (caught) { setError(message(caught)); setStatus('Export failed.'); }
    finally { setBusy(''); }
  }

  const report = artifact?.report.roundTrip;
  const sizeStatus = ringBuildSize({
    outerDiameterMm: inputs.outerDiameterMm.trim() ? Number(inputs.outerDiameterMm) : NaN,
    innerDiameterMm: inputs.innerDiameterMm.trim() ? Number(inputs.innerDiameterMm) : NaN,
    thicknessMm: inputs.thicknessMm.trim() ? Number(inputs.thicknessMm) : NaN,
  });
  return <main>
    <header><div>{studioHref && <a className="lab-studio-link" href={studioHref}>← Hall Design Studio</a>}<h1>Spacer Ring Lab</h1><p>Hall Integrated Systems · From first dimensions to printed-part inspection</p></div><span className="experiment">{studioHref ? 'Geometry Lab' : 'Isolated experiment'}</span></header>
    {page === 'start' ? <section className="lab-start" aria-labelledby="lab-question">
      <div className="lab-intro"><span className="lab-kicker">GEOMETRY LAB / GET STARTED</span><h2 id="lab-question">What would you like to do?</h2><p>Choose your goal. We’ll bring forward the tools and next steps that fit it.</p><span className="lab-intro-line">From measurements to a design you can inspect.</span></div>
      <div className="lab-art" aria-hidden="true"><div className="lab-art-ring"><span /></div><div className="lab-art-caption">OD / ID / H <span>→</span> MODEL <span>→</span> PART</div></div>
      <div className="lab-goals">{labGoals.map(goal => <button type="button" className="lab-goal" key={goal.id} onClick={() => openPage(goal.id)}><span className="lab-goal-number">{goal.number}</span><span className="lab-goal-title">{goal.title}</span><span className="lab-goal-description">{goal.description}</span><span className="lab-goal-action">{goal.action} <span aria-hidden="true">↗</span></span></button>)}</div>
    </section> : <>
      <nav className="lab-navigation" aria-label="Geometry Lab goals"><button type="button" className="lab-back" onClick={() => openPage('start')}>← All goals</button>{labGoals.map(goal => <button type="button" key={goal.id} aria-current={page === goal.id ? 'page' : undefined} onClick={() => openPage(goal.id)}>{goal.title}</button>)}</nav>
    </>}
    <div className="lab-page" hidden={page !== 'design'}>
      <div className="lab-page-heading"><span className="lab-kicker">LET’S MAKE YOUR RING</span><h2>Bring your idea to life</h2><p>Tell us what you need, enter your measurements, and see your ring take shape.</p></div>
      <nav className="design-steps" aria-label="Ring design steps">
        <button type="button" aria-current={designStep === 1 ? 'step' : undefined} onClick={() => setDesignStep(1)}>1. Your ring</button>
        <button type="button" aria-current={designStep === 2 ? 'step' : undefined} onClick={() => setDesignStep(2)}>2. Measurements</button>
        <button type="button" aria-current={designStep === 3 ? 'step' : undefined} disabled={!artifact} onClick={() => setDesignStep(3)}>3. Review &amp; next steps</button>
      </nav>
      {origin === 'demo' ? <div className="notice"><strong>Starting with an example.</strong> Replace the example measurements with measurements from your own parts before using the design.</div> : null}
    <div hidden={designStep !== 1}><RingGuidance kind={ringUse} onKindChange={setRingUse} /><button className="primary step-next" type="button" onClick={() => setDesignStep(2)}>Continue to measurements</button></div>
    <div className="workbench" hidden={designStep !== 2}>
      <section className="dimensions"><h2>Dimensions</h2>
        <label htmlFor="measurement-unit">Measurement unit</label><select id="measurement-unit" value={unit} onChange={event => changeUnit(event.target.value as MeasurementUnit)}><option value="mm">Millimeters (mm)</option><option value="cm">Centimeters (cm)</option><option value="in">Inches (in)</option></select>
        <p className="field-help">Switch units at any time; your measurements stay the same. Converted values are shown rounded to six decimal places; editing a value uses what you enter. For fractions of an inch, enter a decimal (for example, 0.5). Photo measurement and inspection use millimeters.</p>
        <form onSubmit={generate} noValidate>
          <div className="field name-field"><label htmlFor="projectName">Project name</label>
            <input id="projectName" type="text" maxLength={120} value={name} onChange={event => editName(event.target.value)} />
            <p className="field-help">Give your ring a name you’ll recognize later.</p></div>
          {fields.map(field => <div className="field" key={field.key}><label htmlFor={field.key}>{field.label} <span>{unit}</span></label>
            <input id={field.key} type="number" min={fromMillimeters(field.min, unit)} max={fromMillimeters(field.max, unit)} step="any" inputMode="decimal" value={displayInputs[field.key]} aria-describedby={`${field.key}-help`} onChange={event => editDimension(field.key, event.target.value)} />
            <p id={`${field.key}-help`} className="field-help">{field.help}</p></div>)}
          <div className="print-size" aria-live="polite"><strong>Our current print size</strong><p>Up to 320 × 320 × 300 mm (about 12.5984 × 12.5984 × 11.811 in) for one part. For a flat ring, outside diameter is its width and depth. The ring designer currently supports thicknesses up to 250 mm (about 9.8425 in). The millimeter limits control this size check.</p>
            {sizeStatus === 'oversize' ? <p><strong>This design is larger than our current one-piece size.</strong> You can still review it and ask us about options for larger designs.</p> : sizeStatus === 'within' ? <p>Check your measurements and fit before making the final part.</p> : <p>Enter an outside diameter and thickness to check the size.</p>}
          </div>
          {photoFieldFromNote(note) && !artifact ? <p className="notice" role="status">Photo estimate added. Check it with calipers and review all measurements before continuing.</p> : null}
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button className="primary" type="submit">See my ring</button>
          <button className="secondary" type="button" onClick={restoreDemo}>Restore demo dimensions</button>
          <div className="project-actions"><button type="button" disabled={!artifact} onClick={saveProject}>Save project</button>
            <button type="button" onClick={() => fileInput.current?.click()}>Load project</button></div>
        </form>
        <p className="scope">One concentric ring with a through-opening. No mounting holes, fit allowance, or material compensation.</p>
      </section>
      <div className="workspace">{page === 'design' && designStep === 2 ? <Suspense fallback={<div className="preview"><p className="empty">Loading preview…</p></div>}><Preview artifact={artifact} /></Suspense> : null}</div>
    </div>
    <div className="design-review" hidden={designStep !== 3}>
      <div className="review-intro"><h2>Your ring is ready to review</h2><p>Here’s the shape based on the measurements you entered. Check the size and fit before making a final part.</p>{origin === 'demo' ? <p><strong>Example measurements:</strong> change them to match your own parts.</p> : null}</div>
      {page === 'design' && designStep === 3 ? <Suspense fallback={<div className="preview"><p className="empty">Loading preview…</p></div>}><Preview artifact={artifact} /></Suspense> : null}
      {artifact ? <p className="review-dimensions"><strong>Your measurements:</strong> {formatMeasurement(artifact.report.parameters.outerDiameterMm, unit)} {unit} outside · {formatMeasurement(artifact.report.parameters.innerDiameterMm, unit)} {unit} opening · {formatMeasurement(artifact.report.parameters.thicknessMm, unit)} {unit} thick</p> : null}
      <p className="print-size" role="status">{sizeStatus === 'oversize' ? 'This ring is larger than our 320 × 320 × 300 mm one-piece printer volume. Consult us about options; multi-piece assembly is not generated here.' : 'The overall size is within our 320 × 320 × 300 mm printer volume. Slicer checks and physical fit are still needed.'}</p>
      <button type="button" onClick={() => setDesignStep(2)}>Change measurements</button>
      <section className="next-steps"><h2>What would you like to do next?</h2><p>Download a file for a 3D printer, or contact us about your project.</p>
        <div className="exports"><button className="primary" disabled={!artifact || !!busy} onClick={() => void exportFormat('3mf', false)}>Download print file (.3mf)</button><button disabled={!artifact || !!busy} onClick={() => void exportFormat('stl', false)}>Download print file (.stl)</button><button disabled={!artifact} onClick={saveProject}>Save editable project</button></div>
        <p className="field-help">3MF includes millimeter units. STL is another common print-file format; check its scale when opening it.</p>
        {error ? <p className="error" role="alert">{error}</p> : null}
        {lastReport ? <p role="status">Your {lastReport.format.toUpperCase()} {lastDownloadWasReport ? 'report' : 'print file'} was downloaded.</p> : null}
        <RingContact summary={artifact ? buildRingContactSummary({ dimensions: artifact.report.parameters, ringUse, origin, photoEstimate: Boolean(photoFieldFromNote(note)) }) : ''} />
      </section>
      <details className="technical-details"><summary>View technical checks and reports</summary>
        <section className="validation" aria-label="Validation results"><div className="section-heading"><h2>Software geometry checks</h2><span className={artifact ? 'pass' : 'muted'}>{artifact ? 'Passed' : 'Awaiting geometry'}</span></div>
          <p className="status" role="status">{status}</p>
          {report && artifact ? <dl>
            <div><dt>STL dimensions</dt><dd>{report.boundsMm.size.map(value => f(value)).join(' × ')} mm</dd></div>
            <div><dt>Nominal central opening</dt><dd>Ø {f(artifact.report.parameters.innerDiameterMm)} mm at vertices</dd></div>
            <div><dt>Smallest opening across flats</dt><dd>{f(report.minOpeningAcrossFlatsMm)} mm</dd></div>
            <div><dt>Closed, oriented mesh</dt><dd>1 body · 0 open edges</dd></div>
            <div><dt>Surface resolution</dt><dd>{f(report.triangles, 0)} triangles · {f(report.maxChordErrorMm, 5)} mm chord error</dd></div>
            <div><dt>STL integrity</dt><dd>Binary STL re-read and checked · {f(artifact.bytes.length / 1024, 1)} KB</dd></div>
          </dl> : null}
          <div className="exports">
            <button disabled={!artifact || !!busy} onClick={() => void exportFormat('stl', true)}>Download STL report</button>
            <button disabled={!artifact || !!busy} onClick={() => void exportFormat('3mf', true)}>Download 3MF report</button>
            <button disabled={!artifact} onClick={() => { if (artifact) download(JSON.stringify(artifact.report, null, 2), `${artifact.baseName}.validation.json`, 'application/json'); }}>Download legacy validation JSON</button>
          </div>
          {lastReport ? <p className="digest"><strong>Last {lastReport.format.toUpperCase()} export SHA-256:</strong> <code>{lastReport.sha256}</code><br />Checks: {lastReport.checks.join(' · ')}</p> : null}
          {note && artifact ? <p className="provenance-note"><strong>Project input note:</strong> {note}</p> : null}
          <p className="unit-note"><strong>STL</strong> is a common slicer model format and has no declared units. <strong>3MF</strong> declares millimeter units. Import either at 100% scale and check the dimensions. The opening is slightly smaller across polygon flats.</p>
        </section>
      </details>
    </div>
    </div>
    <div className="lab-page" hidden={page !== 'measure'}><div className="lab-page-heading"><span className="lab-kicker">02 / MEASURE</span><h2>Start with a photo</h2><p>Mark a known reference and the dimension you want. Review the proposal, then move it into the ring designer.</p></div><PhotoMeasurePanel onUseEstimate={usePhotoEstimate} /></div>
    <div className="lab-page" hidden={page !== 'plate'}><PlateDesigner /></div>
    <div className="lab-page" hidden={page !== 'inspect'}><div className="lab-page-heading"><span className="lab-kicker">03 / INSPECT</span><h2>Compare the print with the design</h2><p>Load the matching ring project or a prior inspection, then record your physical readings and fit decision.</p></div><div className="lab-inspection-context"><div><strong>Current nominal project</strong><p>{artifact ? `${workflow.project.name} · Ø${f(workflow.project.dimensions.outerDiameterMm)} / Ø${f(workflow.project.dimensions.innerDiameterMm)} / ${f(workflow.project.dimensions.thicknessMm)} mm${origin === 'demo' ? ' · demo dimensions' : ''}` : 'No validated ring is available. Load a project or generate a ring first.'}</p></div><button type="button" onClick={() => fileInput.current?.click()}>Load matching ring project</button></div><InspectionPanel source={artifact ? workflow.project : null} /></div>
    <input ref={fileInput} className="file-input" type="file" accept=".his-ring.json,application/json" aria-label="Choose dimension project JSON" onChange={loadProject} />
  </main>;
}
