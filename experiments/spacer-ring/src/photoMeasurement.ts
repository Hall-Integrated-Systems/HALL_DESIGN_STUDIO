export interface PhotoPoint { x: number; y: number }
export type PhotoPair = readonly [PhotoPoint, PhotoPoint];

export interface PhotoDistanceInput {
  reference: PhotoPair;
  target: PhotoPair;
  referenceMm: number;
  referenceUncertaintyMm?: number;
}

export interface PhotoDistanceProposal {
  estimateMm: number;
  lowerMm: number;
  upperMm: number;
  referencePixels: number;
  targetPixels: number;
  includesReferenceUncertainty: boolean;
}

// Each manually placed endpoint may be off by 2 image pixels in any direction.
const ENDPOINT_SELECTION_ERROR_PX = 2;
const PAIR_ERROR_PX = 2 * ENDPOINT_SELECTION_ERROR_PX;

function pairLength(pair: PhotoPair): number {
  for (const point of pair) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0) {
      throw new Error('Photo landmarks must be finite image coordinates.');
    }
  }
  return Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
}

/** Pixel-scale proposal only; perspective and plane mismatch are not quantified. */
export function measurePhotoDistance(input: PhotoDistanceInput): PhotoDistanceProposal {
  const { referenceMm, referenceUncertaintyMm } = input;
  if (!Number.isFinite(referenceMm) || referenceMm <= 0) throw new Error('Enter a positive known reference length in millimeters.');
  if (referenceUncertaintyMm !== undefined &&
    (!Number.isFinite(referenceUncertaintyMm) || referenceUncertaintyMm < 0 || referenceUncertaintyMm >= referenceMm)) {
    throw new Error('Reference uncertainty must be nonnegative and less than the reference length.');
  }
  const referencePixels = pairLength(input.reference);
  const targetPixels = pairLength(input.target);
  if (referencePixels < 40) throw new Error('Reference landmarks must be at least 40 image pixels apart.');
  if (targetPixels < 20) throw new Error('Target landmarks must be at least 20 image pixels apart.');

  const uncertaintyMm = referenceUncertaintyMm ?? 0;
  const estimateMm = referenceMm * targetPixels / referencePixels;
  const lowerMm = (referenceMm - uncertaintyMm) * (targetPixels - PAIR_ERROR_PX) / (referencePixels + PAIR_ERROR_PX);
  const upperMm = (referenceMm + uncertaintyMm) * (targetPixels + PAIR_ERROR_PX) / (referencePixels - PAIR_ERROR_PX);
  if (![estimateMm, lowerMm, upperMm].every(Number.isFinite)) throw new Error('Photo measurement is outside the supported numeric range.');
  return { estimateMm, lowerMm, upperMm, referencePixels, targetPixels,
    includesReferenceUncertainty: referenceUncertaintyMm !== undefined };
}
