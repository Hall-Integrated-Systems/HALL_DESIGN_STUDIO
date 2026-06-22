import type { AssetCategory, LabelDecalAppearance, StudioAssetPart, StudioMaterial, Vec3 } from '../types/studioTypes';

export interface BuiltInAssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  material: StudioMaterial;
  appearance?: LabelDecalAppearance;
  parts: StudioAssetPart[];
}

export interface ImageDecalAssetDefinition {
  id: string;
  name: string;
  description: string;
  aspectRatio: number;
  tintColor: string;
  opacity: number;
}

const material = (color: string, roughness = 0.58, metalness = 0.04, opacity = 1): StudioMaterial => ({
  color,
  roughness,
  metalness,
  opacity,
});

const part = (
  id: string,
  kind: StudioAssetPart['kind'],
  position: Vec3,
  scale: Vec3,
  rotation: Vec3 = [0, 0, 0],
  partMaterial?: Partial<StudioMaterial>,
): StudioAssetPart => ({
  id,
  kind,
  position,
  rotation,
  scale,
  material: partMaterial,
});

export const assetCategories: AssetCategory[] = ['Logos', 'Product Parts', 'Fixtures / Stands', 'Background Props', 'Image / Decal', 'Imported Models'];

export const imageDecalAssets: ImageDecalAssetDefinition[] = [
  { id: 'blank-label', name: 'Blank Label', description: 'Plain label plane for mock product labels.', aspectRatio: 2.6, tintColor: '#f7f9fb', opacity: 1 },
  { id: 'product-tag', name: 'Product Tag', description: 'Small tag plane for callouts and product identifiers.', aspectRatio: 1.65, tintColor: '#d8dde6', opacity: 1 },
  {
    id: 'front-logo-placement-guide',
    name: 'Front Logo Placement Guide',
    description: 'Transparent guide plane for front logo placement.',
    aspectRatio: 2.2,
    tintColor: '#00aeef',
    opacity: 0.36,
  },
  {
    id: 'side-decal-placement-guide',
    name: 'Side Decal Placement Guide',
    description: 'Long transparent guide plane for side decal placement.',
    aspectRatio: 3.5,
    tintColor: '#ff6b1a',
    opacity: 0.32,
  },
];

export const builtInAssets: BuiltInAssetDefinition[] = [
  {
    id: 'h-logo-placeholder',
    name: 'H Logo Placeholder',
    category: 'Logos',
    material: material('#0057a8', 0.42, 0.08),
    parts: [
      part('left-stem', 'cube', [-0.28, 0.42, 0], [0.16, 0.84, 0.08]),
      part('right-stem', 'cube', [0.28, 0.42, 0], [0.16, 0.84, 0.08]),
      part('crossbar', 'cube', [0, 0.42, 0], [0.72, 0.14, 0.08]),
    ],
  },
  {
    id: 'product-base-plate',
    name: 'Product Base Plate',
    category: 'Fixtures / Stands',
    material: material('#2b3036', 0.5, 0.12),
    parts: [part('plate', 'cube', [0, 0.04, 0], [2.4, 0.08, 1.55]), part('bevel-hint', 'cube', [0, 0.11, 0], [2.2, 0.06, 1.35])],
  },
  {
    id: 'simple-display-stand',
    name: 'Simple Display Stand',
    category: 'Fixtures / Stands',
    material: material('#b8c0c8', 0.36, 0.55),
    parts: [
      part('base', 'cylinder', [0, 0.05, 0], [1.15, 0.1, 1.15]),
      part('post', 'cylinder', [0, 0.55, 0], [0.18, 1, 0.18]),
      part('top-pad', 'cube', [0, 1.08, 0], [1.05, 0.12, 0.72]),
    ],
  },
  {
    id: 'wall-mount-plate',
    name: 'Wall Mount Plate',
    category: 'Product Parts',
    material: material('#9aa3ad', 0.62, 0.05),
    parts: [
      part('plate', 'cube', [0, 0.5, 0], [1.3, 1, 0.08]),
      part('top-hole', 'cylinder', [0, 0.78, 0.06], [0.12, 0.03, 0.12], [Math.PI / 2, 0, 0], { color: '#11151c' }),
      part('bottom-hole', 'cylinder', [0, 0.22, 0.06], [0.12, 0.03, 0.12], [Math.PI / 2, 0, 0], { color: '#11151c' }),
    ],
  },
  {
    id: 'small-bracket',
    name: 'Small Bracket',
    category: 'Product Parts',
    material: material('#2b3036', 0.48, 0.18),
    parts: [part('vertical', 'cube', [-0.28, 0.42, 0], [0.14, 0.84, 0.56]), part('foot', 'cube', [0.12, 0.07, 0], [0.94, 0.14, 0.56])],
  },
  {
    id: 'l-bracket',
    name: 'L Bracket',
    category: 'Product Parts',
    material: material('#8f99a4', 0.46, 0.3),
    parts: [
      part('vertical-plate', 'cube', [0, 0.62, -0.42], [1.4, 1.24, 0.12]),
      part('base-plate', 'cube', [0, 0.06, 0.12], [1.4, 0.12, 1.2]),
      part('vertical-hole-left', 'cylinder', [-0.42, 0.68, -0.34], [0.14, 0.035, 0.14], [Math.PI / 2, 0, 0], { color: '#11151c' }),
      part('vertical-hole-right', 'cylinder', [0.42, 0.68, -0.34], [0.14, 0.035, 0.14], [Math.PI / 2, 0, 0], { color: '#11151c' }),
      part('base-hole-left', 'cylinder', [-0.42, 0.13, 0.18], [0.14, 0.035, 0.14], [0, 0, 0], { color: '#11151c' }),
      part('base-hole-right', 'cylinder', [0.42, 0.13, 0.18], [0.14, 0.035, 0.14], [0, 0, 0], { color: '#11151c' }),
    ],
  },
  {
    id: 'label-tag',
    name: 'Label Tag',
    category: 'Background Props',
    material: material('#f7f9fb', 0.72, 0),
    appearance: { fillColor: '#f7f9fb', foregroundColor: '#0057a8' },
    parts: [
      part('tag', 'cube', [0, 0.24, 0], [1.2, 0.48, 0.035]),
      part('stripe', 'cube', [0, 0.36, 0.03], [0.98, 0.07, 0.02], [0, 0, 0], { color: '#0057a8' }),
    ],
  },
  {
    id: 'screw-boss-placeholder',
    name: 'Screw Boss Placeholder',
    category: 'Product Parts',
    material: material('#9aa3ad', 0.68, 0.02),
    parts: [
      part('boss', 'cylinder', [0, 0.25, 0], [0.46, 0.5, 0.46]),
      part('hole', 'cylinder', [0, 0.52, 0], [0.18, 0.04, 0.18], [0, 0, 0], { color: '#11151c' }),
    ],
  },
];
