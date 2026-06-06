import type { BackgroundMode, CameraPreset, ProjectTemplateId, ScreenshotSize, StudioSettings } from '../types/studioTypes';

export interface ProjectTemplateDefinition {
  id: ProjectTemplateId;
  name: string;
  description: string;
  recommendedExportSize: ScreenshotSize;
  backgroundMode: BackgroundMode;
  intendedUse: string;
  cameraPreset: CameraPreset;
  cameraDistance: number;
  title: string;
  notes: string;
  settings: Partial<StudioSettings>;
  starterAssetIds: string[];
}

export const projectTemplates: ProjectTemplateDefinition[] = [
  {
    id: 'blank-studio',
    name: 'Blank Studio',
    description: 'Empty scene with neutral workbench settings for scratch staging.',
    recommendedExportSize: 'viewport',
    backgroundMode: 'dark',
    intendedUse: 'General layout exploration',
    cameraPreset: 'isometric',
    cameraDistance: 6,
    title: 'Blank Studio',
    notes: 'Start from an empty staging workspace.',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: true, shadowsEnabled: true, screenshotSize: 'viewport' },
    starterAssetIds: [],
  },
  {
    id: 'website-product-tile',
    name: 'Website Product Tile',
    description: 'Square high-resolution setup for clean product cards.',
    recommendedExportSize: 'square-2400',
    backgroundMode: 'transparent',
    intendedUse: 'Website product tiles',
    cameraPreset: 'isometric',
    cameraDistance: 5.5,
    title: 'Website Product Tile',
    notes: 'Import or insert one product, apply material presets, frame selected, then export 2400x2400.',
    settings: { backgroundMode: 'transparent', floorVisible: false, gridVisible: false, shadowsEnabled: false, screenshotSize: 'square-2400' },
    starterAssetIds: [],
  },
  {
    id: 'website-banner',
    name: 'Website Banner',
    description: 'Dark premium widescreen scene for hero and support graphics.',
    recommendedExportSize: 'hd-1920',
    backgroundMode: 'dark',
    intendedUse: 'Website banners',
    cameraPreset: 'isometric',
    cameraDistance: 7,
    title: 'Website Banner',
    notes: 'Use Frame All after placing products and support assets. Export 1920x1080.',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'hd-1920' },
    starterAssetIds: [],
  },
  {
    id: 'autodesk-application-image',
    name: 'Autodesk Application Image',
    description: 'Clean catalog-style white scene for technical application images.',
    recommendedExportSize: 'square-2400',
    backgroundMode: 'light',
    intendedUse: 'Application images and technical mockups',
    cameraPreset: 'isometric',
    cameraDistance: 6,
    title: 'Autodesk Application Image',
    notes: 'Use prototype gray, satin metal, HIS blue, and catalog-style shadows. Export 2400x2400.',
    settings: { backgroundMode: 'light', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'square-2400' },
    starterAssetIds: [],
  },
  {
    id: 'photoshop-cutout',
    name: 'Photoshop Cutout',
    description: 'Transparent cutout setup for compositing.',
    recommendedExportSize: 'square-2400',
    backgroundMode: 'transparent',
    intendedUse: 'Photoshop and Illustrator compositing',
    cameraPreset: 'front',
    cameraDistance: 5.5,
    title: 'Photoshop Cutout',
    notes: 'Transparent background, no floor, no grid, no shadows. Export 2400x2400 PNG.',
    settings: { backgroundMode: 'transparent', floorVisible: false, gridVisible: false, shadowsEnabled: false, screenshotSize: 'square-2400' },
    starterAssetIds: [],
  },
  {
    id: 'product-base-display',
    name: 'Product Base Display',
    description: 'Catalog scene with a base plate and simple display stand.',
    recommendedExportSize: 'square-2400',
    backgroundMode: 'light',
    intendedUse: 'Reusable product display scenes',
    cameraPreset: 'isometric',
    cameraDistance: 7,
    title: 'Product Base Display',
    notes: 'Place the product on the display stand, frame all, then export a square catalog image.',
    settings: { backgroundMode: 'light', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'square-2400' },
    starterAssetIds: ['product-base-plate', 'simple-display-stand'],
  },
  {
    id: 'bracket-mount-concept',
    name: 'Bracket / Mount Concept',
    description: 'Starter concept scene with wall plate, bracket, and screw boss placeholder.',
    recommendedExportSize: 'square-2400',
    backgroundMode: 'light',
    intendedUse: 'Mounting concept mockups',
    cameraPreset: 'isometric',
    cameraDistance: 6.5,
    title: 'Bracket / Mount Concept',
    notes: 'Use this for quick bracket and mounting layout reviews before detailed CAD work.',
    settings: { backgroundMode: 'light', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'square-2400' },
    starterAssetIds: ['wall-mount-plate', 'small-bracket', 'screw-boss-placeholder'],
  },
  {
    id: 'logo-hero-render',
    name: 'Logo Hero Render',
    description: 'Dark premium logo scene for branded presentation graphics.',
    recommendedExportSize: 'hd-1920',
    backgroundMode: 'dark',
    intendedUse: 'Logo hero and brand graphics',
    cameraPreset: 'isometric',
    cameraDistance: 5.25,
    title: 'Logo Hero Render',
    notes: 'Use HIS Blue, Electric Cyan, or Premium Black material treatments for hero graphics.',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: false, shadowsEnabled: true, screenshotSize: 'hd-1920' },
    starterAssetIds: ['h-logo-placeholder'],
  },
  {
    id: 'workbench-review-scene',
    name: 'Workbench Review Scene',
    description: 'Grid-enabled review scene for arranging parts and mockups.',
    recommendedExportSize: 'viewport',
    backgroundMode: 'dark',
    intendedUse: 'Internal review and layout planning',
    cameraPreset: 'isometric',
    cameraDistance: 8,
    title: 'Workbench Review Scene',
    notes: 'Use this when arranging several components before choosing a final render preset.',
    settings: { backgroundMode: 'dark', floorVisible: true, gridVisible: true, shadowsEnabled: true, screenshotSize: 'viewport' },
    starterAssetIds: ['product-base-plate', 'label-tag'],
  },
];

export const getProjectTemplate = (id: ProjectTemplateId) => projectTemplates.find((template) => template.id === id);
