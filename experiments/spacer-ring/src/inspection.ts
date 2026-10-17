import type { RingDimensions } from './geometry.ts';
import { validateDimensions } from './geometry.ts';

export type InspectionFeature = keyof RingDimensions;
export type FitStatus = 'not-checked' | 'acceptable' | 'unacceptable';

export interface RingInspection {
  kind: 'his-spacer-ring-inspection';
  schemaVersion: 1;
  units: 'mm';
  partName: string;
  recordedOn: string;
  nominal: RingDimensions;
  readings: Record<InspectionFeature, number[]>;
  acceptedMeasurements: InspectionFeature[];
  fit: { status: FitStatus; note: string };
  note: string;
}

const FEATURES: InspectionFeature[] = ['outerDiameterMm', 'innerDiameterMm', 'thicknessMm'];
const MAX_BYTES = 64 * 1024;
const MAX_READINGS = 16;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  if (keys.some(key => !Object.prototype.hasOwnProperty.call(value, key)) || Object.keys(value).some(key => !keys.includes(key))) {
    throw new Error(`${label} contains missing or unexpected fields.`);
  }
}

function text(value: unknown, label: string, limit: number, required = false): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const trimmed = value.trim();
  if (Array.from(trimmed).length > limit || (required && !trimmed)) throw new Error(`${label} must be ${required ? '1–' : 'at most '}${limit} characters.`);
  return trimmed;
}

function readings(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || value.length > MAX_READINGS || value.some(item => typeof item !== 'number' || !Number.isFinite(item) || item <= 0 || item > 2000)) {
    throw new Error(`${label} must contain at most 16 positive finite readings no greater than 2000 mm.`);
  }
  return [...value] as number[];
}

function normalize(value: unknown): RingInspection {
  const source = object(value, 'Inspection');
  exactKeys(source, ['kind', 'schemaVersion', 'units', 'partName', 'recordedOn', 'nominal', 'readings', 'acceptedMeasurements', 'fit', 'note'], 'Inspection');
  if (source.kind !== 'his-spacer-ring-inspection' || source.schemaVersion !== 1 || source.units !== 'mm') {
    throw new Error('Unsupported inspection kind, schema version, or units.');
  }
  const partName = text(source.partName, 'Part name', 120, true);
  const recordedOn = text(source.recordedOn, 'Record date', 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedOn) || Number.isNaN(Date.parse(`${recordedOn}T00:00:00Z`)) || new Date(`${recordedOn}T00:00:00Z`).toISOString().slice(0, 10) !== recordedOn) {
    throw new Error('Record date must be a real YYYY-MM-DD date.');
  }

  const rawNominal = object(source.nominal, 'Nominal dimensions');
  exactKeys(rawNominal, FEATURES, 'Nominal dimensions');
  const nominal = {
    outerDiameterMm: rawNominal.outerDiameterMm,
    innerDiameterMm: rawNominal.innerDiameterMm,
    thicknessMm: rawNominal.thicknessMm,
  } as RingDimensions;
  validateDimensions(nominal);

  const rawReadings = object(source.readings, 'Readings');
  exactKeys(rawReadings, FEATURES, 'Readings');
  const checkedReadings: RingInspection['readings'] = {
    outerDiameterMm: readings(rawReadings.outerDiameterMm, 'Outside diameter'),
    innerDiameterMm: readings(rawReadings.innerDiameterMm, 'Opening diameter'),
    thicknessMm: readings(rawReadings.thicknessMm, 'Thickness'),
  };

  if (!Array.isArray(source.acceptedMeasurements)) throw new Error('Accepted measurements must be a list.');
  const accepted: InspectionFeature[] = [];
  for (const feature of source.acceptedMeasurements) {
    if (!FEATURES.includes(feature as InspectionFeature)) throw new Error('Accepted measurement has an unknown feature.');
    if (accepted.includes(feature as InspectionFeature)) throw new Error('Duplicate accepted measurement.');
    if (!checkedReadings[feature as InspectionFeature].length) throw new Error('An accepted measurement needs at least one reading.');
    accepted.push(feature as InspectionFeature);
  }

  const rawFit = object(source.fit, 'Fit');
  exactKeys(rawFit, ['status', 'note'], 'Fit');
  if (rawFit.status !== 'not-checked' && rawFit.status !== 'acceptable' && rawFit.status !== 'unacceptable') throw new Error('Unknown fit status.');
  const fitNote = text(rawFit.note, 'Fit note', 500);
  if (rawFit.status !== 'not-checked' && !fitNote) throw new Error('Fit note is required for a fit decision.');
  const note = text(source.note, 'Inspection note', 1000);
  if (accepted.length && !note) throw new Error('Inspection note is required when accepting measured values.');

  return {
    kind: 'his-spacer-ring-inspection', schemaVersion: 1, units: 'mm', partName, recordedOn,
    nominal: { ...nominal }, readings: checkedReadings, acceptedMeasurements: accepted,
    fit: { status: rawFit.status, note: fitNote }, note,
  };
}

export function createInspection(input: unknown): RingInspection {
  const source = object(input, 'Inspection input');
  return normalize({ kind: 'his-spacer-ring-inspection', schemaVersion: 1, units: 'mm', ...source });
}

export function parseInspection(json: string): RingInspection {
  if (typeof json !== 'string') throw new Error('Inspection input must be text.');
  if (new TextEncoder().encode(json).byteLength > MAX_BYTES) throw new Error('Inspection exceeds 64 KiB UTF-8 size limit.');
  return normalize(JSON.parse(json) as unknown);
}

export function serializeInspection(inspection: RingInspection): string {
  return JSON.stringify(normalize(inspection), null, 2) + '\n';
}

export function parseReadings(input: string): number[] {
  if (typeof input !== 'string') throw new Error('Readings input must be text.');
  const tokens = input.split(/[,\n]+/).map(token => token.trim()).filter(Boolean);
  if (tokens.length > MAX_READINGS) throw new Error('Enter at most 16 readings per dimension.');
  const values = tokens.map(token => Number(token));
  if (values.some(value => !Number.isFinite(value))) throw new Error('Each reading must be a number in millimeters.');
  if (values.some(value => value <= 0 || value > 2000)) throw new Error('Each reading must be positive and no greater than 2000 mm.');
  return values;
}

export function differenceMm(reading: number, nominal: number): number {
  if (!Number.isFinite(reading) || !Number.isFinite(nominal)) throw new Error('Difference needs finite measurements.');
  return Math.round((reading - nominal) * 10000) / 10000;
}
