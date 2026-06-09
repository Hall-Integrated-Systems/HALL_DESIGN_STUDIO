import type {
  CameraPreset,
  FrameTarget,
  ProductRenderPreset,
  SceneTemplate,
  StudioMaterial,
  StudioSettings,
} from '../types/studioTypes';

export const APP_VERSION = '2.2.0';

export const brandColorPresets: Array<{ id: string; label: string; color: string }> = [
  { id: 'his-blue', label: 'HIS Blue', color: '#0057a8' },
  { id: 'deep-navy', label: 'Deep Navy', color: '#071b33' },
  { id: 'electric-cyan', label: 'Electric Cyan', color: '#00aeef' },
  { id: 'graphite', label: 'Graphite', color: '#2b3036' },
  { id: 'matte-black', label: 'Matte Black', color: '#08090b' },
  { id: 'white', label: 'White', color: '#f7f9fb' },
  { id: 'silver', label: 'Silver', color: '#b8c0c8' },
  { id: 'safety-orange', label: 'Safety Orange', color: '#ff6b1a' },
];

export const materialPresets: Array<{ id: string; label: string; material: StudioMaterial }> = [
  { id: 'matte-plastic', label: 'Matte Plastic', material: { color: '#d8dde6', roughness: 0.82, metalness: 0, opacity: 1 } },
  { id: 'gloss-plastic', label: 'Gloss Plastic', material: { color: '#f0f4f8', roughness: 0.18, metalness: 0, opacity: 1 } },
  { id: 'satin-metal', label: 'Satin Metal', material: { color: '#aeb7c0', roughness: 0.34, metalness: 0.82, opacity: 1 } },
  { id: 'brushed-aluminum', label: 'Brushed Aluminum', material: { color: '#c9d0d6', roughness: 0.52, metalness: 0.9, opacity: 1 } },
  { id: 'rubber-black', label: 'Rubber Black', material: { color: '#050607', roughness: 0.92, metalness: 0, opacity: 1 } },
  { id: 'glass-clear-plastic', label: 'Glass/Clear Plastic', material: { color: '#cfefff', roughness: 0.04, metalness: 0, opacity: 0.32 } },
  { id: 'prototype-gray', label: 'Prototype Gray', material: { color: '#9aa3ad', roughness: 0.68, metalness: 0.02, opacity: 1 } },
  { id: 'premium-black', label: 'Premium Black', material: { color: '#06080a', roughness: 0.24, metalness: 0.18, opacity: 1 } },
];

export const sceneTemplates: Record<SceneTemplate, { label: string; cameraPreset: CameraPreset; settings: Partial<StudioSettings> }> = {
  'catalog-white': {
    label: 'Catalog White',
    cameraPreset: 'isometric',
    settings: { backgroundMode: 'light', floorVisible: true, gridVisible: false, shadowsEnabled: true },
  },
  'dark-premium': {
    label: 'Dark Premium',
    cameraPreset: 'isometric',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: false, shadowsEnabled: true },
  },
  'transparent-cutout': {
    label: 'Transparent Cutout',
    cameraPreset: 'front',
    settings: { backgroundMode: 'transparent', floorVisible: false, gridVisible: false, shadowsEnabled: false },
  },
  'workbench-layout': {
    label: 'Workbench Layout',
    cameraPreset: 'isometric',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: true, shadowsEnabled: true },
  },
};

export const productRenderPresets: Record<
  ProductRenderPreset,
  { label: string; cameraPreset: CameraPreset; frameTarget: FrameTarget; settings: Partial<StudioSettings> }
> = {
  'website-product-tile': {
    label: 'Website Product Tile',
    cameraPreset: 'isometric',
    frameTarget: 'selected',
    settings: { backgroundMode: 'transparent', floorVisible: false, gridVisible: false, shadowsEnabled: false, screenshotSize: 'square-2400' },
  },
  'website-banner': {
    label: 'Website Banner',
    cameraPreset: 'isometric',
    frameTarget: 'all',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'hd-1920' },
  },
  'autodesk-application-image': {
    label: 'Autodesk Application Image',
    cameraPreset: 'isometric',
    frameTarget: 'selected',
    settings: { backgroundMode: 'light', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'square-2400' },
  },
  'photoshop-cutout': {
    label: 'Photoshop Cutout',
    cameraPreset: 'front',
    frameTarget: 'selected',
    settings: { backgroundMode: 'transparent', floorVisible: false, gridVisible: false, shadowsEnabled: false, screenshotSize: 'square-2400' },
  },
};
