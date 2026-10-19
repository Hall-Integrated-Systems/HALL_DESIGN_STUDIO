import { useEffect, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import type { RingDimensions } from './geometry.ts';
import { imageEndpointUncertaintyPx, measurePhotoDistance } from './photoMeasurement.ts';
import type { PhotoDistanceProposal, PhotoPoint } from './photoMeasurement.ts';

type DimensionKey = keyof RingDimensions;
interface Props { onUseEstimate: (field: DimensionKey, valueMm: number, provenanceNote: string) => void }
interface LocalPhoto { url: string; name: string }
interface PhotoLandmark extends PhotoPoint { imagePixelsPerDisplayedPixel: number }

const targets: Array<{ field: DimensionKey; label: string; min: number; max: number }> = [
  { field: 'outerDiameterMm', label: 'Outside diameter', min: 2, max: 1000 },
  { field: 'innerDiameterMm', label: 'Opening diameter', min: 1, max: 999.6 },
  { field: 'thicknessMm', label: 'Thickness', min: 0.2, max: 250 },
];
const markerLabels = ['Reference A', 'Reference B', 'Target A', 'Target B'];
const fmt = (value: number) => value.toFixed(2);

export default function PhotoMeasurePanel({ onUseEstimate }: Props) {
  const [photo, setPhoto] = useState<LocalPhoto | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [points, setPoints] = useState<PhotoLandmark[]>([]);
  const [referenceMm, setReferenceMm] = useState('');
  const [referenceUncertaintyMm, setReferenceUncertaintyMm] = useState('');
  const [endpointAllowancePx, setEndpointAllowancePx] = useState('2');
  const [targetField, setTargetField] = useState<DimensionKey>('outerDiameterMm');
  const [samePlane, setSamePlane] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSamePlane(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP photo.'); return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPhotoError('Choose a photo under 25 MiB.'); return;
    }
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
    setImageSize(null); setPoints([]); setSamePlane(false); setPhotoError('');
  }

  function markPoint(event: MouseEvent<HTMLImageElement>) {
    if (!imageSize || points.length >= 4) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(imageSize.width, (event.clientX - rect.left) * imageSize.width / rect.width));
    const y = Math.max(0, Math.min(imageSize.height, (event.clientY - rect.top) * imageSize.height / rect.height));
    const imagePixelsPerDisplayedPixel = imageEndpointUncertaintyPx(1, imageSize, { width: rect.width, height: rect.height });
    setSamePlane(false);
    setPoints(previous => previous.length < 4 ? [...previous, { x, y, imagePixelsPerDisplayedPixel }] : previous);
  }

  function imageFailed() {
    setImageSize(null); setPoints([]); setSamePlane(false);
    setPhotoError('This image could not be displayed. Choose another photo.');
  }

  let proposal: PhotoDistanceProposal | null = null;
  let proposalError = '';
  if (imageSize && points.length === 4) {
    try {
      const displayAllowance = Number(endpointAllowancePx);
      if (!Number.isFinite(displayAllowance) || displayAllowance <= 0) {
        throw new Error('Enter a positive finite endpoint placement allowance in displayed pixels.');
      }
      // Retain each click's scale if the image is resized between placements.
      // Upscaling cannot reduce the assumed allowance below two original pixels.
      const endpointUncertaintyPx = Math.max(2, displayAllowance * Math.max(...points.map(point => point.imagePixelsPerDisplayedPixel)));
      proposal = measurePhotoDistance({
        reference: [points[0], points[1]], target: [points[2], points[3]],
        referenceMm: Number(referenceMm),
        referenceUncertaintyMm: referenceUncertaintyMm.trim() ? Number(referenceUncertaintyMm) : undefined,
        endpointUncertaintyPx,
      });
    } catch (caught) { proposalError = caught instanceof Error ? caught.message : 'Could not calculate the photo proposal.'; }
  }
  const selectedTarget = targets.find(target => target.field === targetField)!;
  const withinInputRange = !!proposal && proposal.estimateMm >= selectedTarget.min && proposal.estimateMm <= selectedTarget.max;

  function useEstimate() {
    if (!photo || !imageSize || !proposal || !samePlane || !withinInputRange) return;
    const valueMm = Number(proposal.estimateMm.toFixed(2));
    const coordinates = points.map(point => `(${Math.round(point.x)},${Math.round(point.y)})`).join(' ');
    const filename = Array.from(photo.name.replace(/\s+/g, ' '));
    const shortFilename = filename.slice(0, 100).join('') + (filename.length > 100 ? '…' : '');
    const referencePrecision = referenceUncertaintyMm.trim() ? ` ±${Number(referenceUncertaintyMm)} mm` : ' (reference uncertainty not supplied)';
    const note = `User-confirmed provisional photo proposal for ${selectedTarget.label} from ${shortFilename} (${imageSize.width}x${imageSize.height} original px). Reference ${Number(referenceMm)} mm${referencePrecision}; landmarks ${coordinates}; estimate ${fmt(proposal.estimateMm)} mm, assumed selection/reference range ${fmt(proposal.lowerMm)}–${fmt(proposal.upperMm)} mm. Endpoint allowance ±${Number(endpointAllowancePx)} displayed px, conservative ±${proposal.endpointUncertaintyPx} original px (maximum placement scale; minimum 2 original px). Coplanar, parallel span and near-perpendicular view assumed; perspective/depth/lens error unquantified. Verify with calipers before manufacturing.`;
    onUseEstimate(targetField, valueMm, note);
  }

  return <section className="photo-measure" aria-label="Photo measurement proposal">
    <div className="section-heading"><h2>Measure from a photo</h2><span className="muted">Local proposal</span></div>
    <p className="muted">Place a known-length reference beside the measured span, in the same plane and parallel to it, and use a nearly perpendicular view. A background object is not a scale reference. For thickness, the reference must be coplanar with the measured thickness span. This tool does not upload or save the photo.</p>
    <p className="notice"><strong>Provisional dimensions.</strong> The interval covers only the assumed endpoint placement and entered reference uncertainty; it is not a confidence interval or a fit tolerance. This tool cannot detect or correct perspective, depth mismatch, or lens distortion. Check with calipers and replace provisional inputs with verified design dimensions before manufacturing.</p>
    <div className="photo-controls">
      <div className="photo-control"><label htmlFor="measurementPhoto">Photo</label><input id="measurementPhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />{photo ? <p className="field-help photo-file-name">Loaded locally: {photo.name}</p> : null}</div>
      <div className="photo-control"><label htmlFor="knownReferenceMm">Known reference length <span>mm</span></label><input id="knownReferenceMm" type="number" min="0" step="any" inputMode="decimal" value={referenceMm} onChange={event => { setReferenceMm(event.target.value); setSamePlane(false); }} /></div>
      <div className="photo-control"><label htmlFor="referenceUncertaintyMm">Reference uncertainty <span>± mm, optional</span></label><input id="referenceUncertaintyMm" type="number" min="0" step="any" inputMode="decimal" value={referenceUncertaintyMm} onChange={event => { setReferenceUncertaintyMm(event.target.value); setSamePlane(false); }} /></div>
      <div className="photo-control"><label htmlFor="endpointAllowancePx">Endpoint placement allowance <span>± displayed px</span></label><input id="endpointAllowancePx" type="number" min="0" step="any" inputMode="decimal" value={endpointAllowancePx} onChange={event => { setEndpointAllowancePx(event.target.value); setSamePlane(false); }} aria-describedby="endpointAllowanceHelp" /><p id="endpointAllowanceHelp" className="field-help">Positive radial allowance per point, assumed rather than measured. Increase it for unclear edges or imprecise placement. The calculation uses the largest placement scale and at least ±2 original-image pixels, even if enlarged.</p></div>
      <div className="photo-control"><label htmlFor="photoTarget">Dimension to propose</label><select id="photoTarget" value={targetField} onChange={event => { setTargetField(event.target.value as DimensionKey); setSamePlane(false); }}>{targets.map(target => <option key={target.field} value={target.field}>{target.label}</option>)}</select></div>
    </div>
    {photoError ? <p className="error" role="alert">{photoError}</p> : null}
    {photo ? <div className="photo-area">
      <p className="field-help">Click or tap four points: reference A, reference B, target A, target B. Choose opposite edges across the center for a diameter. <strong>Next: {markerLabels[points.length] ?? 'all points placed'}</strong></p>
      <div className="photo-frame"><img key={photo.url} src={photo.url} alt={`Local measurement photo: ${photo.name}`} onClick={markPoint} onLoad={event => {
        const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
        if (![width, height].every(value => Number.isFinite(value) && value > 0)) { imageFailed(); return; }
        setImageSize({ width, height }); setPoints([]); setSamePlane(false); setPhotoError('');
      }} onError={imageFailed} />
        {imageSize ? points.map((point, index) => <span key={index} className={`photo-marker ${index < 2 ? 'reference-marker' : 'target-marker'}`} style={{ left: `${point.x / imageSize.width * 100}%`, top: `${point.y / imageSize.height * 100}%` }} aria-hidden="true">{index + 1}</span>) : null}
      </div>
      <div className="photo-actions"><span>{points.length} of 4 landmarks placed</span><button type="button" onClick={() => { setPoints([]); setSamePlane(false); }} disabled={!points.length}>Clear points</button></div>
    </div> : null}
    {proposalError ? <p className="error" role="alert">{proposalError}</p> : null}
    {proposal ? <div className="photo-result">
      <p><strong>Provisional {selectedTarget.label.toLowerCase()} estimate: {fmt(proposal.estimateMm)} mm</strong></p>
      <p>Assumed selection/reference range: {fmt(proposal.lowerMm)}–{fmt(proposal.upperMm)} mm. Assumed endpoint allowance: ±{Number(endpointAllowancePx)} displayed px, converted conservatively to ±{fmt(proposal.endpointUncertaintyPx)} original-image px per point{proposal.includesReferenceUncertainty ? '; includes the entered reference uncertainty' : '; reference uncertainty was not supplied'}. Perspective, depth mismatch, and lens distortion remain unquantified.</p>
      {!withinInputRange ? <p className="error">The estimate is outside this dimension’s supported input range.</p> : null}
      <label className="photo-confirm"><input type="checkbox" checked={samePlane} onChange={event => setSamePlane(event.target.checked)} />I reviewed this proposal and checked that the nearby reference is coplanar and parallel to the measured span, with an approximately perpendicular view.</label>
      <button type="button" className="primary" disabled={!samePlane || !withinInputRange} onClick={useEstimate}>Use estimate as dimension input</button>
      <p className="field-help">This only fills an input and disables the old export. Verify and edit the dimensions before manufacturing, then select Generate &amp; validate to check the geometry. Geometry validation does not validate photo accuracy. The project records the proposal in its provenance note; the image itself is not saved.</p>
    </div> : null}
  </section>;
}
