import type { RingDimensions } from './geometry.ts';

export type MeasurementUnit = 'mm' | 'cm' | 'in';
const millimetersPerUnit: Record<MeasurementUnit, number> = { mm: 1, cm: 10, in: 25.4 };
export const PLUS5_BUILD_MM = Object.freeze({ width: 320, depth: 320, height: 300 });

export function toMillimeters(value: number, unit: MeasurementUnit): number {
  return value * millimetersPerUnit[unit];
}
export function fromMillimeters(value: number, unit: MeasurementUnit): number {
  return value / millimetersPerUnit[unit];
}
export function formatMeasurement(valueMm: number, unit: MeasurementUnit): string {
  return String(Number(fromMillimeters(valueMm, unit).toFixed(6)));
}
export function ringBuildSize(dimensions: RingDimensions): 'within' | 'oversize' | 'unknown' {
  const { outerDiameterMm, thicknessMm } = dimensions;
  if (!Number.isFinite(outerDiameterMm) || !Number.isFinite(thicknessMm) || outerDiameterMm <= 0 || thicknessMm <= 0) return 'unknown';
  return outerDiameterMm <= PLUS5_BUILD_MM.width && outerDiameterMm <= PLUS5_BUILD_MM.depth && thicknessMm <= PLUS5_BUILD_MM.height ? 'within' : 'oversize';
}
