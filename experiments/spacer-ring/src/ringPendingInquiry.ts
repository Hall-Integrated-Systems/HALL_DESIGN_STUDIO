import { formatMeasurement } from './unitsAndSize.ts';
import { buildRingContactSummary } from './ringContact.ts';
import type { RingDimensions } from './geometry.ts';
import type { RingUse } from './RingGuidance.tsx';
import type { RingProject } from './project.ts';

type PendingInputs = Record<keyof RingDimensions, string>;

// Project provenance is not per-field confirmation: a partial edit may leave
// other dimensions at example values even after geometry was generated.
export function buildReviewedRingInquiry(input: Parameters<typeof buildRingContactSummary>[0]): string {
  return `${buildRingContactSummary(input)}\nDimensions may still include starting examples. Confirm every measurement and fit against the actual parts.`;
}

// The editable fields can contain a mixture of user entries and demo values.
// Present all of them as unconfirmed until the customer can check their parts.
export function buildPendingRingInquiry({ inputs, ringUse, origin, photoEstimate }: {
  inputs: PendingInputs;
  ringUse: RingUse;
  origin: RingProject['provenance']['origin'];
  photoEstimate: boolean;
}): string {
  const uses: Record<RingUse, string> = {
    '': 'Not specified', speaker: 'Speaker spacer', subwoofer: 'Subwoofer spacer',
    tweeter: 'Tweeter adapter', general: 'General ring',
  };
  const format = (value: string) => {
    const numeric = Number(value);
    return value.trim() && Number.isFinite(numeric) ? `${formatMeasurement(numeric, 'mm')} mm` : 'Not provided';
  };
  const lines = [
    'Spacer ring inquiry',
    `Use: ${uses[ringUse]}`,
    'Working measurements are unconfirmed and may include example values.',
    `Outside diameter: ${format(inputs.outerDiameterMm)}`,
    `Opening diameter: ${format(inputs.innerDiameterMm)}`,
    `Thickness: ${format(inputs.thicknessMm)}`,
  ];
  if (origin === 'demo') lines.push('The design is currently using example dimensions.');
  if (photoEstimate) lines.push('A photo estimate is provisional and must be verified with calipers.');
  return lines.join('\n');
}
