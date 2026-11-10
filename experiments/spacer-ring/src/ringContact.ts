import type { RingDimensions } from './geometry.ts';
import type { RingUse } from './RingGuidance.tsx';
import type { RingProject } from './project.ts';
import { formatMeasurement } from './unitsAndSize.ts';

export function buildRingContactSummary({ dimensions, ringUse, origin, photoEstimate }: { dimensions: RingDimensions; ringUse: RingUse; origin: RingProject['provenance']['origin']; photoEstimate: boolean }): string {
  const uses: Record<RingUse, string> = { '': 'Not specified', speaker: 'Speaker spacer', subwoofer: 'Subwoofer spacer', tweeter: 'Tweeter adapter', general: 'General ring' };
  const lines = ['Spacer ring inquiry', `Use: ${uses[ringUse]}`, `Outside diameter: ${formatMeasurement(dimensions.outerDiameterMm, 'mm')} mm`, `Opening diameter: ${formatMeasurement(dimensions.innerDiameterMm, 'mm')} mm`, `Thickness: ${formatMeasurement(dimensions.thicknessMm, 'mm')} mm`];
  if (origin === 'demo') lines.push('These are example measurements and must be checked against the actual parts.');
  if (photoEstimate) lines.push('A dimension is based on a photo estimate; verify it with calipers before use.');
  return lines.join('\n');
}
