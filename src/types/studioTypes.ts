export type PrimitiveKind = 'cube' | 'cylinder' | 'sphere' | 'plane';

export type AssetCategory = 'Logos' | 'Product Parts' | 'Fixtures / Stands' | 'Background Props' | 'Image / Decal' | 'Imported Models';

export type StudioObjectKind = PrimitiveKind | 'model' | 'asset' | 'image';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export type CameraPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'isometric';

export type BackgroundMode = 'dark' | 'light' | 'transparent';

export type ScreenshotSize = 'viewport' | 'square-1200' | 'hd-1920' | 'square-2400';

export type SceneTemplate = 'catalog-white' | 'dark-premium' | 'transparent-cutout' | 'workbench-layout';

export type ProductRenderPreset = 'website-product-tile' | 'website-banner' | 'autodesk-application-image' | 'photoshop-cutout';

export type ProjectTemplateId =
  | 'blank-studio'
  | 'website-product-tile'
  | 'website-banner'
  | 'autodesk-application-image'
  | 'photoshop-cutout'
  | 'product-base-display'
  | 'bracket-mount-concept'
  | 'logo-hero-render'
  | 'workbench-review-scene';

export type FrameTarget = 'selected' | 'all';

export type Vec3 = [number, number, number];

export interface StudioMaterial {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
}

export interface StudioObject {
  id: string;
  name: string;
  kind: StudioObjectKind;
  assetId?: string;
  assetCategory?: AssetCategory;
  parts?: StudioAssetPart[];
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material: StudioMaterial;
  imagePlane?: ImagePlaneData;
  locked: boolean;
  visible: boolean;
  modelDataUrl?: string;
  fileName?: string;
}

export interface ImagePlaneData {
  imageDataUrl?: string;
  fileName?: string;
  width: number;
  height: number;
  opacity: number;
  doubleSided: boolean;
  preserveAspectRatio: boolean;
  tintColor: string;
  placeholder: boolean;
}

export interface StudioAssetPart {
  id: string;
  kind: PrimitiveKind;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material?: Partial<StudioMaterial>;
}

export interface StudioSettings {
  backgroundMode: BackgroundMode;
  floorVisible: boolean;
  gridVisible: boolean;
  shadowsEnabled: boolean;
  screenshotSize: ScreenshotSize;
  exportFileName: string;
  exportFileNameEdited: boolean;
}

export interface StudioProject {
  version: 1;
  appVersion?: string;
  savedAt?: string;
  title?: string;
  notes?: string;
  objects: StudioObject[];
  settings?: StudioSettings;
}
