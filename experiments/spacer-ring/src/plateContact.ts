import { guidanceSteps } from './plateGuidance.ts';
import type { GuidanceAnswers, GuidanceKey } from './plateGuidance.ts';
import { formatMeasurement, toMillimeters } from './unitsAndSize.ts';
import type { MeasurementUnit } from './unitsAndSize.ts';
import type { PlateDimensions } from './plateGeometry.ts';

export interface PlateContactDetails {
  size: string;
  haveParts: string;
  unit: MeasurementUnit;
  values: Record<string, string>;
  answers: GuidanceAnswers;
  edited: readonly string[];
  guided: boolean;
}

export function classifyPlateReview({ answers, edited }: Pick<PlateContactDetails, 'answers' | 'edited'>): 'example' | 'unconfirmed' | 'confirmed' {
  if (guidanceSteps.every(step => answers[step.key] === 'confirmed')) return 'confirmed';
  return guidanceSteps.some(step => answers[step.key] !== 'confirmed' && !edited.includes(step.key)) ? 'example' : 'unconfirmed';
}

export function buildPlateContactSummary(details: PlateContactDetails): string {
  const parts: Record<string, string> = { unsure: 'Not sure yet', both: 'Speaker and factory part', speaker: 'Speaker', factory: 'Factory part', neither: 'Neither yet' };
  const lines = ['Speaker mounting plate inquiry', `Speaker size: ${details.size || 'Not specified'}`, `Available to measure: ${parts[details.haveParts] || 'Not specified'}`, 'Measurements:'];
  for (const step of guidanceSteps) {
    const key: GuidanceKey = step.key;
    const status = details.answers[key];
    let value = status === 'help' ? 'Needs help' : 'Not confirmed';
    if (status === 'confirmed' || (!details.guided && details.edited.includes(key))) {
      const raw = details.values[key]?.trim();
      if (raw && Number.isFinite(Number(raw))) {
        const scalar = key.endsWith('Count') || key.endsWith('Rotation');
        const numeric = Number(raw);
        const formatted = scalar ? formatMeasurement(numeric, 'mm') : formatMeasurement(toMillimeters(numeric, details.unit), details.unit);
        const suffix = key.endsWith('Count') ? '' : key.endsWith('Rotation') ? '°' : ` ${details.unit}`;
        value = `${formatted}${suffix}${status === 'confirmed' ? ' (confirmed)' : ' (entered)'}`;
      }
    }
    lines.push(`${step.label}: ${value}`);
  }
  return lines.join('\n');
}

// A quote needs the working design values as well as the confirmation states.
// Keep these out of the early-help summary, where examples are not customer measurements.
export function buildPlateQuoteSummary(details: PlateContactDetails, dimensions: PlateDimensions): string {
  const working: Record<GuidanceKey, number> = {
    outerDiameterMm: dimensions.outerDiameterMm, innerDiameterMm: dimensions.innerDiameterMm, thicknessMm: dimensions.thicknessMm,
    speakerCount: dimensions.speaker.count, speakerPitch: dimensions.speaker.pitchDiameterMm, speakerHole: dimensions.speaker.holeDiameterMm, speakerRotation: dimensions.speaker.rotationDeg,
    vehicleCount: dimensions.vehicle.count, vehiclePitch: dimensions.vehicle.pitchDiameterMm, vehicleHole: dimensions.vehicle.holeDiameterMm, vehicleRotation: dimensions.vehicle.rotationDeg,
  };
  const lines = [buildPlateContactSummary(details), '', 'Working plate design values (millimeters; rounded to six decimals; not verified for manufacturing):'];
  for (const step of guidanceSteps) {
    const key = step.key;
    const raw = details.values[key]?.trim();
    if (!raw || !Number.isFinite(working[key])) {
      lines.push(`${step.label}: Not provided (unconfirmed)`);
      continue;
    }
    const status = details.answers[key];
    const formatted = formatMeasurement(working[key], 'mm');
    const suffix = key.endsWith('Count') ? '' : key.endsWith('Rotation') ? '°' : ' mm';
    const label = status === 'confirmed' ? 'confirmed by customer; fit not verified' : status === 'help' ? 'help requested; unconfirmed and may be an example' : details.edited.includes(key) ? 'entered; unconfirmed' : 'starting example; unconfirmed';
    lines.push(`${step.label}: ${formatted}${suffix} (${label})`);
  }
  return lines.join('\n');
}
