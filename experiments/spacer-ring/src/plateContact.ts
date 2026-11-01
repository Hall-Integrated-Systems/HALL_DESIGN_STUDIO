import { guidanceSteps } from './plateGuidance.ts';
import type { GuidanceAnswers, GuidanceKey } from './plateGuidance.ts';
import type { MeasurementUnit } from './unitsAndSize.ts';

export interface PlateContactDetails {
  size: string;
  haveParts: string;
  unit: MeasurementUnit;
  values: Record<string, string>;
  answers: GuidanceAnswers;
  edited: readonly string[];
  guided: boolean;
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
        const suffix = key.endsWith('Count') ? '' : key.endsWith('Rotation') ? '°' : ` ${details.unit}`;
        value = `${raw}${suffix}${status === 'confirmed' ? ' (confirmed)' : ' (entered)'}`;
      }
    }
    lines.push(`${step.label}: ${value}`);
  }
  return lines.join('\n');
}
