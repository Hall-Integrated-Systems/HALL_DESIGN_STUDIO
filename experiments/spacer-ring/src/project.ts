import type { RingDimensions } from './geometry.ts';
import { validateDimensions } from './geometry.ts';

export interface RingProject {
  kind: 'his-spacer-ring-project';
  schemaVersion: 1;
  units: 'mm';
  name: string;
  dimensions: RingDimensions;
  provenance: { origin: 'demo' | 'user-entered'; note?: string };
}

const MAX_PROJECT_BYTES = 64 * 1024;
const dimensionKeys = ['outerDiameterMm', 'innerDiameterMm', 'thicknessMm'];

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []): void {
  const present = Object.keys(value);
  if (required.some(key => !Object.prototype.hasOwnProperty.call(value, key)) || present.some(key => !required.includes(key) && !optional.includes(key))) {
    throw new Error('Project contains missing or unexpected fields.');
  }
}

function normalize(value: unknown): RingProject {
  const source = record(value, 'Project');
  exactKeys(source, ['kind', 'schemaVersion', 'units', 'name', 'dimensions', 'provenance']);
  if (source.kind !== 'his-spacer-ring-project' || source.schemaVersion !== 1 || source.units !== 'mm') {
    throw new Error('Unsupported project kind, schema version, or units.');
  }
  if (typeof source.name !== 'string') throw new Error('Project name must be text.');
  const name = source.name.trim();
  if (Array.from(name).length < 1 || Array.from(name).length > 120) throw new Error('Project name must be 1–120 characters.');

  const rawDimensions = record(source.dimensions, 'Dimensions');
  exactKeys(rawDimensions, dimensionKeys);
  const dimensions = {
    outerDiameterMm: rawDimensions.outerDiameterMm,
    innerDiameterMm: rawDimensions.innerDiameterMm,
    thicknessMm: rawDimensions.thicknessMm,
  } as RingDimensions;
  validateDimensions(dimensions);

  const rawProvenance = record(source.provenance, 'Provenance');
  exactKeys(rawProvenance, ['origin'], ['note']);
  if (rawProvenance.origin !== 'demo' && rawProvenance.origin !== 'user-entered') throw new Error('Unsupported project origin.');
  if (Object.prototype.hasOwnProperty.call(rawProvenance, 'note') && (typeof rawProvenance.note !== 'string' || Array.from(rawProvenance.note).length > 1000)) {
    throw new Error('Project note must be text of at most 1000 characters.');
  }
  const provenance: RingProject['provenance'] = { origin: rawProvenance.origin };
  if (typeof rawProvenance.note === 'string') provenance.note = rawProvenance.note;
  return { kind: 'his-spacer-ring-project', schemaVersion: 1, units: 'mm', name, dimensions: { ...dimensions }, provenance };
}

export function parseProject(json: string): RingProject {
  if (typeof json !== 'string') throw new Error('Project input must be text.');
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES) throw new Error('Project exceeds 64 KiB UTF-8 size limit.');
  return normalize(JSON.parse(json) as unknown);
}

export function serializeProject(project: RingProject): string {
  return JSON.stringify(normalize(project), null, 2) + '\n';
}

export function createProject(dimensions: RingDimensions, name: string, origin: 'demo' | 'user-entered', note?: string): RingProject {
  const provenance = note === undefined ? { origin } : { origin, note };
  return normalize({ kind: 'his-spacer-ring-project', schemaVersion: 1, units: 'mm', name, dimensions, provenance });
}
