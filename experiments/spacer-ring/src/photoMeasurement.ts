export interface PhotoPoint { x: number; y: number }
export type PhotoPair = readonly [PhotoPoint, PhotoPoint];
export interface PhotoSize { width: number; height: number }

export interface PhotoDistanceInput {
  reference: PhotoPair;
  target: PhotoPair;
  referenceMm: number;
  referenceUncertaintyMm?: number;
  /** Assumed radial error per endpoint in original-image pixels, not a confidence level. */
  endpointUncertaintyPx?: number;
}

export interface PhotoDistanceProposal {
  estimateMm: number;
  lowerMm: number;
  upperMm: number;
  referencePixels: number;
  targetPixels: number;
  includesReferenceUncertainty: boolean;
  endpointUncertaintyPx: number;
  uncertaintyScope: 'selection-and-reference-only';
}

/** Convert a radial display-pixel allowance using the larger axis scale. */
export function imageEndpointUncertaintyPx(displayAllowancePx: number, image: PhotoSize, displayed: PhotoSize): number {
  if (!Number.isFinite(displayAllowancePx) || displayAllowancePx <= 0) {
    throw new Error('Endpoint placement allowance must be positive and finite.');
  }
  if (![image.width, image.height, displayed.width, displayed.height].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Image and display sizes must be positive and finite.');
  }
  const result = displayAllowancePx * Math.max(image.width / displayed.width, image.height / displayed.height);
  if (!Number.isFinite(result) || result <= 0) throw new Error('Endpoint placement allowance is outside the supported numeric range.');
  return result;
}

function pairLength(pair: PhotoPair): number {
  for (const point of pair) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0) {
      throw new Error('Photo landmarks must be finite image coordinates.');
    }
  }
  const length = Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
  if (!Number.isFinite(length)) throw new Error('Photo landmark distance is outside the supported numeric range.');
  return length;
}

/** Pixel-scale proposal only; perspective and plane mismatch are not quantified. */
export function measurePhotoDistance(input: PhotoDistanceInput): PhotoDistanceProposal {
  const { referenceMm, referenceUncertaintyMm } = input;
  const endpointUncertaintyPx = input.endpointUncertaintyPx ?? 2;
  if (!Number.isFinite(endpointUncertaintyPx) || endpointUncertaintyPx <= 0) {
    throw new Error('Endpoint placement allowance must be positive and finite.');
  }
  if (!Number.isFinite(referenceMm) || referenceMm <= 0) throw new Error('Enter a positive known reference length in millimeters.');
  if (referenceUncertaintyMm !== undefined &&
    (!Number.isFinite(referenceUncertaintyMm) || referenceUncertaintyMm < 0 || referenceUncertaintyMm >= referenceMm)) {
    throw new Error('Reference uncertainty must be nonnegative and less than the reference length.');
  }
  const referencePixels = pairLength(input.reference);
  const targetPixels = pairLength(input.target);
  // Preserve the original span/error ratios (40/2 and 20/2) when the allowance grows.
  // These are selection-resolution guards, never evidence of acceptable camera geometry.
  if (referencePixels < Math.max(40, 20 * endpointUncertaintyPx)) {
    throw new Error('Reference landmarks need a larger span: at least 40 image pixels and 20 times the endpoint allowance. Enlarge the view and mark again.');
  }
  if (targetPixels < Math.max(20, 10 * endpointUncertaintyPx)) {
    throw new Error('Target landmarks need a larger span: at least 20 image pixels and 10 times the endpoint allowance. Enlarge the view and mark again.');
  }
  const pairErrorPx = 2 * endpointUncertaintyPx;
  if (pairErrorPx >= referencePixels || pairErrorPx >= targetPixels) {
    throw new Error('Landmark spans must exceed twice the endpoint placement allowance. Use a clearer, larger view and mark again.');
  }

  const uncertaintyMm = referenceUncertaintyMm ?? 0;
  const estimateMm = referenceMm * (targetPixels / referencePixels);
  const lowerMm = (referenceMm - uncertaintyMm) * ((targetPixels - pairErrorPx) / (referencePixels + pairErrorPx));
  const upperMm = (referenceMm + uncertaintyMm) * ((targetPixels + pairErrorPx) / (referencePixels - pairErrorPx));
  if (![estimateMm, lowerMm, upperMm].every(value => Number.isFinite(value) && value > 0) || lowerMm > estimateMm || estimateMm > upperMm) {
    throw new Error('Photo measurement is outside the supported numeric range.');
  }
  return { estimateMm, lowerMm, upperMm, referencePixels, targetPixels,
    includesReferenceUncertainty: referenceUncertaintyMm !== undefined,
    endpointUncertaintyPx, uncertaintyScope: 'selection-and-reference-only' };
}
