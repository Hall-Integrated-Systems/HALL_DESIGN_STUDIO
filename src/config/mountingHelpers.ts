import type { MountingHelperKind, StudioMaterial, Vec3 } from '../types/studioTypes';

export interface MountingHelperDefinition {
  kind: MountingHelperKind;
  label: string;
  baseName: string;
  material: StudioMaterial;
  diameter: number;
  slotLength: number;
  slotWidth: number;
  standoffHeight: number;
  clearanceSize: Vec3;
}

const material = (color: string, opacity = 1): StudioMaterial => ({
  color,
  roughness: 0.55,
  metalness: 0.02,
  opacity,
});

export const mountingHelpers: MountingHelperDefinition[] = [
  {
    kind: 'round-hole',
    label: 'Round Hole Marker',
    baseName: 'Round Hole',
    material: material('#11151c', 0.9),
    diameter: 0.42,
    slotLength: 0.8,
    slotWidth: 0.26,
    standoffHeight: 0.5,
    clearanceSize: [1, 0.04, 1],
  },
  {
    kind: 'slotted-hole',
    label: 'Slotted Hole Marker',
    baseName: 'Slot',
    material: material('#11151c', 0.88),
    diameter: 0.36,
    slotLength: 0.9,
    slotWidth: 0.28,
    standoffHeight: 0.5,
    clearanceSize: [1.2, 0.04, 0.55],
  },
  {
    kind: 'washer',
    label: 'Washer Marker',
    baseName: 'Washer',
    material: material('#b8c0c8', 0.86),
    diameter: 0.62,
    slotLength: 0.9,
    slotWidth: 0.28,
    standoffHeight: 0.5,
    clearanceSize: [1, 0.04, 1],
  },
  {
    kind: 'rivnut',
    label: 'Rivnut Marker',
    baseName: 'Rivnut',
    material: material('#00aeef', 0.82),
    diameter: 0.48,
    slotLength: 0.9,
    slotWidth: 0.28,
    standoffHeight: 0.5,
    clearanceSize: [1, 0.04, 1],
  },
  {
    kind: 'standoff',
    label: 'Spacer / Standoff Marker',
    baseName: 'Standoff',
    material: material('#9aa3ad', 0.9),
    diameter: 0.38,
    slotLength: 0.9,
    slotWidth: 0.28,
    standoffHeight: 0.65,
    clearanceSize: [1, 0.04, 1],
  },
  {
    kind: 'bolt-head',
    label: 'Screw / Bolt Head Marker',
    baseName: 'Bolt Head',
    material: material('#d8dde6', 0.92),
    diameter: 0.48,
    slotLength: 0.9,
    slotWidth: 0.28,
    standoffHeight: 0.5,
    clearanceSize: [1, 0.04, 1],
  },
  {
    kind: 'centerline',
    label: 'Centerline Marker',
    baseName: 'Centerline',
    material: material('#ff6b1a', 0.86),
    diameter: 0.2,
    slotLength: 1.65,
    slotWidth: 0.035,
    standoffHeight: 0.5,
    clearanceSize: [1.65, 0.04, 0.1],
  },
  {
    kind: 'clearance-zone',
    label: 'Clearance Zone Marker',
    baseName: 'Clearance Zone',
    material: material('#00aeef', 0.22),
    diameter: 0.5,
    slotLength: 1,
    slotWidth: 1,
    standoffHeight: 0.5,
    clearanceSize: [1.4, 0.05, 1.1],
  },
];

export function getMountingHelperDefinition(kind: MountingHelperKind) {
  return mountingHelpers.find((helper) => helper.kind === kind);
}
