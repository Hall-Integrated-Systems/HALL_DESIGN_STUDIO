import { useEffect, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import type { RingDimensions } from './geometry.ts';
import { measurePhotoDistance } from './photoMeasurement.ts';
import type { PhotoDistanceProposal, PhotoPoint } from './photoMeasurement.ts';

type DimensionKey = keyof RingDimensions;
interface Props { onUseEstimate: (field: DimensionKey, valueMm: number, provenanceNote: string) => void }
interface LocalPhoto { url: string; name: string }

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
  const [points, setPoints] = useState<PhotoPoint[]>([]);
  const [referenceMm, setReferenceMm] = useState('');
  const [referenceUncertaintyMm, setReferenceUncertaintyMm] = useState('');
  const [targetField, setTargetField] = useState<DimensionKey>('outerDiameterMm');
  const [samePlane, setSamePlane] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
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
    setPoints(previous => previous.length < 4 ? [...previous, { x, y }] : previous);
  }

  let proposal: PhotoDistanceProposal | null = null;
  let proposalError = '';
  if (points.length === 4) {
    try {
      proposal = measurePhotoDistance({
        reference: [points[0], points[1]], target: [points[2], points[3]],
        referenceMm: Number(referenceMm),
        referenceUncertaintyMm: referenceUncertaintyMm.trim() ? Number(referenceUncertaintyMm) : undefined,
      });
    } catch (caught) { proposalError = caught instanceof Error ? caught.message : 'Could not calculate the photo proposal.'; }
  }
  const selectedTarget = targets.find(target => target.field === targetField)!;
  const withinInputRange = !!proposal && proposal.estimateMm >= selectedTarget.min && proposal.estimateMm <= selectedTarget.max;

  function useEstimate() {
    if (!photo || !imageSize || !proposal || !samePlane || !withinInputRange) return;
    const valueMm = Number(proposal.estimateMm.toFixed(2));
    const coordinates = points.map(point => `(${Math.round(point.x)},${Math.round(point.y)})`).join(' ');
    const referencePrecision = referenceUncertaintyMm.trim() ? ` ±${referenceUncertaintyMm.trim()} mm` : ' (reference uncertainty not supplied)';
    const note = `User-confirmed photo proposal for ${selectedTarget.label} from ${photo.name} (${imageSize.width}x${imageSize.height} px). Reference ${referenceMm} mm${referencePrecision}; landmarks ${coordinates}; estimate ${fmt(proposal.estimateMm)} mm, marker/reference range ${fmt(proposal.lowerMm)}–${fmt(proposal.upperMm)} mm. Same-plane, near-perpendicular view assumed; perspective error unquantified.`;
    onUseEstimate(targetField, valueMm, note);
  }

  return <section className="photo-measure" aria-label="Photo measurement proposal">
    <div className="section-heading"><h2>Measure from a photo</h2><span className="muted">Local proposal</span></div>
    <p className="muted">Use a known-length reference in the same plane as the part. A box or other background object is not a scale reference. This tool does not upload or save the photo.</p>
    <div className="photo-controls">
      <div className="photo-control"><label htmlFor="measurementPhoto">Photo</label><input id="measurementPhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />{photo ? <p className="field-help photo-file-name">Loaded locally: {photo.name}</p> : null}</div>
      <div className="photo-control"><label htmlFor="knownReferenceMm">Known reference length <span>mm</span></label><input id="knownReferenceMm" type="number" min="0" step="any" inputMode="decimal" value={referenceMm} onChange={event => setReferenceMm(event.target.value)} /></div>
      <div className="photo-control"><label htmlFor="referenceUncertaintyMm">Reference uncertainty <span>± mm, optional</span></label><input id="referenceUncertaintyMm" type="number" min="0" step="any" inputMode="decimal" value={referenceUncertaintyMm} onChange={event => setReferenceUncertaintyMm(event.target.value)} /></div>
      <div className="photo-control"><label htmlFor="photoTarget">Dimension to propose</label><select id="photoTarget" value={targetField} onChange={event => setTargetField(event.target.value as DimensionKey)}>{targets.map(target => <option key={target.field} value={target.field}>{target.label}</option>)}</select></div>
    </div>
    {photoError ? <p className="error" role="alert">{photoError}</p> : null}
    {photo ? <div className="photo-area">
      <p className="field-help">Click or tap four points: reference A, reference B, target A, target B. Choose opposite edges across the center for a diameter. <strong>Next: {markerLabels[points.length] ?? 'all points placed'}</strong></p>
      <div className="photo-frame"><img src={photo.url} alt={`Local measurement photo: ${photo.name}`} onClick={markPoint} onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setPhotoError('This image could not be displayed.')} />
        {imageSize ? points.map((point, index) => <span key={index} className={`photo-marker ${index < 2 ? 'reference-marker' : 'target-marker'}`} style={{ left: `${point.x / imageSize.width * 100}%`, top: `${point.y / imageSize.height * 100}%` }} aria-hidden="true">{index + 1}</span>) : null}
      </div>
      <div className="photo-actions"><span>{points.length} of 4 landmarks placed</span><button type="button" onClick={() => setPoints([])} disabled={!points.length}>Clear points</button></div>
    </div> : null}
    {proposalError ? <p className="error" role="alert">{proposalError}</p> : null}
    {proposal ? <div className="photo-result">
      <p><strong>{selectedTarget.label} estimate: {fmt(proposal.estimateMm)} mm</strong></p>
      <p>Marker/reference range: {fmt(proposal.lowerMm)}–{fmt(proposal.upperMm)} mm. This assumes ±2 image pixels per endpoint{proposal.includesReferenceUncertainty ? ' and includes the entered reference uncertainty' : '; reference uncertainty was not supplied'}. Perspective and plane mismatch are not included.</p>
      {!withinInputRange ? <p className="error">The estimate is outside this dimension’s supported input range.</p> : null}
      <label className="photo-confirm"><input type="checkbox" checked={samePlane} onChange={event => setSamePlane(event.target.checked)} />I checked that the reference and target are in the same plane and the view is approximately perpendicular.</label>
      <button type="button" className="primary" disabled={!samePlane || !withinInputRange} onClick={useEstimate}>Use estimate as dimension input</button>
      <p className="field-help">This only fills an input and disables the old export. Review the value, then select Generate &amp; validate. The resulting project records the photo proposal in its provenance note; the image itself is not saved.</p>
    </div> : null}
  </section>;
}
