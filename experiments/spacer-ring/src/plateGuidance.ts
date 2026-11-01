export const guidanceSteps = [
  { key: 'outerDiameterMm', title: 'How wide should the plate be?', label: 'Outside diameter', help: 'Measure straight across the space the plate can cover, through the center. Check that the entire plate has a flat surface to sit on.' },
  { key: 'innerDiameterMm', title: 'How wide should the opening be?', label: 'Opening diameter', help: 'Measure the opening needed for the speaker basket. Check the speaker and the vehicle opening; choosing a nominal speaker size does not supply this measurement.' },
  { key: 'thicknessMm', title: 'How thick should the plate be?', label: 'Plate thickness', help: 'Measure the available distance between the mounting surfaces. Check clearance behind the speaker and in front of it. The current design range is 3–25 mm.' },
  { key: 'speakerCount', title: 'How many speaker screws?', label: 'Number of speaker holes', help: 'Count the speaker mounting holes. This version places them evenly around a circle.' },
  { key: 'speakerPitch', title: 'Where are the speaker holes?', label: 'Speaker hole-center circle diameter', help: 'Measure across the circle passing through the hole centers. If there are opposite holes, measure from the center of one hole to the center of the opposite hole.' },
  { key: 'speakerHole', title: 'How wide are the speaker holes?', label: 'Speaker hole diameter', help: 'Enter the hole opening you need for your hardware. No automatic screw clearance is added.' },
  { key: 'speakerRotation', title: 'Which way do the speaker holes point?', label: 'Speaker pattern rotation', help: 'Viewed from the speaker-facing side, zero puts the first hole to the right. Positive angles turn counterclockwise. Use the same view and reference for both patterns.' },
  { key: 'vehicleCount', title: 'How many factory mounting points?', label: 'Number of vehicle holes', help: 'Count the existing vehicle mounting points. This version places them evenly around a circle.' },
  { key: 'vehiclePitch', title: 'Where are the vehicle holes?', label: 'Vehicle hole-center circle diameter', help: 'Measure across the circle passing through the hole centers. For opposite holes, measure center to center across the opening.' },
  { key: 'vehicleHole', title: 'How wide are the vehicle holes?', label: 'Vehicle hole diameter', help: 'Enter the hole opening needed for the vehicle hardware. No automatic screw clearance is added.' },
  { key: 'vehicleRotation', title: 'Which way do the vehicle holes point?', label: 'Vehicle pattern rotation', help: 'Viewed from the speaker-facing side, zero puts the first hole to the right. Positive angles turn counterclockwise. Use the same view and reference for both patterns.' },
] as const;
export type GuidanceKey = typeof guidanceSteps[number]['key'];
export type GuidanceAnswers = Partial<Record<GuidanceKey, 'confirmed' | 'help'>>;
export function updateGuidanceAnswer(answers: GuidanceAnswers, key: GuidanceKey, answer: 'confirmed' | 'help'): GuidanceAnswers { return { ...answers, [key]: answer }; }
export function missingGuidanceAnswers(answers: GuidanceAnswers): GuidanceKey[] { return guidanceSteps.filter(step => answers[step.key] !== 'confirmed').map(step => step.key); }
