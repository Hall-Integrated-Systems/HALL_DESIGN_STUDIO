import type { RingDimensions } from './geometry.ts';
import { generateRing, validateDimensions } from './geometry.ts';
import { validateRing } from './validation.ts';

export const GENERATOR_VERSION = 'HIS Geometry Lab v0.2.0';
export type ExportFormat = 'stl' | '3mf';
export interface ExportReport {
  schemaVersion: 1;
  format: ExportFormat;
  units: 'mm';
  generatorVersion: string;
  parameters: RingDimensions;
  byteLength: number;
  sha256: string;
  sourceMesh: ReturnType<typeof validateRing>;
  checks: string[];
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 is unavailable in this browser environment.');
  const exactBytes = bytes.slice();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', exactBytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createExportReport(bytes: Uint8Array, format: ExportFormat, dimensions: RingDimensions, checks: string[]): Promise<ExportReport> {
  if (format !== 'stl' && format !== '3mf') throw new Error('Unsupported export format.');
  if (!(bytes instanceof Uint8Array)) throw new Error('Export bytes are required.');
  if (!Array.isArray(checks) || checks.length === 0 || checks.some(check => typeof check !== 'string' || !check.trim())) {
    throw new Error('List the checks executed for this export.');
  }
  const parameters = { ...dimensions };
  validateDimensions(parameters);
  const sourceMesh = validateRing(generateRing(parameters), parameters);
  return { schemaVersion: 1, format, units: 'mm', generatorVersion: GENERATOR_VERSION,
    parameters, byteLength: bytes.byteLength, sha256: await sha256Hex(bytes), sourceMesh, checks: [...checks] };
}
