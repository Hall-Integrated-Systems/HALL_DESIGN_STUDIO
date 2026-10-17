export type Vec3 = [number, number, number];
export type Triangle = [number, number, number];
export interface RingDimensions { outerDiameterMm: number; innerDiameterMm: number; thicknessMm: number }
export interface MeshData { vertices: Vec3[]; triangles: Triangle[] }
export const DEMO_DIMENSIONS: Readonly<RingDimensions> = Object.freeze({ outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 });
// Numerical / resource envelope for this experiment, NOT a printable material specification.
export const MAX_CHORD_ERROR_MM = 0.02;
export const DIMENSION_TOLERANCE_MM = 0.0001;

export function validateDimensions(d: RingDimensions): void {
  if (!d || [d.outerDiameterMm, d.innerDiameterMm, d.thicknessMm].some(v => typeof v !== 'number' || !Number.isFinite(v))) {
    throw new Error('Enter a finite number for all three dimensions in millimeters.');
  }
  if (d.outerDiameterMm < 2 || d.outerDiameterMm > 1000) throw new Error('Outside diameter must be 2–1000 mm.');
  if (d.innerDiameterMm < 1 || d.innerDiameterMm > d.outerDiameterMm - 0.4) throw new Error('Opening must be at least 1 mm and leave at least 0.2 mm of radial wall.');
  if (d.thicknessMm < 0.2 || d.thicknessMm > 250) throw new Error('Thickness must be 0.2–250 mm.');
}

export function segmentCount(d: RingDimensions): number {
  validateDimensions(d);
  // Multiples of four place vertices at all cardinal extrema, preserving OD bounding dimensions.
  return Math.max(64, 4 * Math.ceil(Math.PI / Math.acos(1 - MAX_CHORD_ERROR_MM / (d.outerDiameterMm / 2)) / 4));
}

export function generateRing(d: RingDimensions): MeshData {
  const n = segmentCount(d);
  const vertices: Vec3[] = [];
  for (const z of [0, d.thicknessMm]) {
    for (const radius of [d.outerDiameterMm / 2, d.innerDiameterMm / 2]) {
      for (let i = 0; i < n; i++) {
        const angle = 2 * Math.PI * i / n;
        // Exact cardinal points avoid signed zero / tiny trigonometric offsets at the axes.
        const unit: [number, number] = i % (n / 4) === 0
          ? ([[1, 0], [0, 1], [-1, 0], [0, -1]] as [number, number][])[i / (n / 4)]
          : [Math.cos(angle), Math.sin(angle)];
        vertices.push([radius * unit[0], radius * unit[1], z]);
      }
    }
  }
  const triangles: Triangle[] = [];
  const quad = (a: number, b: number, c: number, e: number) => { triangles.push([a, b, c], [a, c, e]); };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    quad(i, j, 2 * n + j, 2 * n + i); // Outside: outward.
    quad(n + j, n + i, 3 * n + i, 3 * n + j); // Bore: toward the axis.
    quad(2 * n + i, 2 * n + j, 3 * n + j, 3 * n + i); // Top: +Z.
    quad(j, i, n + i, n + j); // Bottom: -Z.
  }
  return { vertices, triangles };
}
