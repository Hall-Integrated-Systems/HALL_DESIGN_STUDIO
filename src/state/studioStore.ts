import { create } from 'zustand';
import type {
  AnnotationKind,
  BackgroundMode,
  CameraPreset,
  FrameTarget,
  PrimitiveKind,
  ProductRenderPreset,
  ProjectTemplateId,
  ScreenshotSize,
  SceneTemplate,
  StudioObject,
  StudioProject,
  StudioSettings,
  TransformMode,
  Vec3,
} from '../types/studioTypes';
import { productRenderPresets, sceneTemplates } from '../config/presets';
import { builtInAssets, imageDecalAssets } from '../config/assets';
import { getProjectTemplate } from '../config/projectTemplates';

interface ImportedAssetHistoryItem {
  id: string;
  name: string;
  fileName: string;
  modelDataUrl: string;
}

interface ImportedImageHistoryItem {
  id: string;
  name: string;
  fileName: string;
  imageDataUrl: string;
  width: number;
  height: number;
}

interface StudioState {
  objects: StudioObject[];
  importedAssetHistory: ImportedAssetHistoryItem[];
  importedImageHistory: ImportedImageHistoryItem[];
  projectTitle: string;
  projectNotes: string;
  isDirty: boolean;
  selectedObjectId: string | null;
  transformMode: TransformMode;
  cameraPreset: CameraPreset;
  cameraDistance: number;
  cameraResetToken: number;
  frameRequest: { target: FrameTarget; token: number } | null;
  exportRequestToken: number;
  settings: StudioSettings;
  addPrimitive: (kind: PrimitiveKind) => void;
  addModel: (fileName: string, modelDataUrl: string) => void;
  addImagePlane: (fileName: string, imageDataUrl: string, width: number, height: number) => void;
  addAnnotation: (kind: AnnotationKind) => void;
  addBuiltInAsset: (assetId: string) => void;
  addImageDecalAsset: (assetId: string) => void;
  addImportedAsset: (assetId: string) => void;
  addImportedImage: (assetId: string) => void;
  applyProjectTemplate: (templateId: ProjectTemplateId) => void;
  clearScene: () => void;
  markSaved: () => void;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, patch: Partial<StudioObject>) => void;
  updateObjectTransform: (id: string, transform: Partial<Pick<StudioObject, 'position' | 'rotation' | 'scale'>>) => void;
  updateObjectMaterial: (id: string, material: Partial<StudioObject['material']>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  setTransformMode: (mode: TransformMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setCameraDistance: (distance: number) => void;
  resetCamera: () => void;
  requestFrame: (target: FrameTarget) => void;
  requestExportScreenshot: () => void;
  applySceneTemplate: (template: SceneTemplate) => void;
  applyProductRenderPreset: (preset: ProductRenderPreset) => void;
  updateSettings: (settings: Partial<StudioSettings>) => void;
  updateExportFileName: (fileName: string) => void;
  updateProjectInfo: (info: Partial<Pick<StudioState, 'projectTitle' | 'projectNotes'>>) => void;
  loadProject: (project: StudioProject) => void;
}

const DEFAULT_MATERIAL = {
  color: '#d8dde6',
  roughness: 0.48,
  metalness: 0.05,
  opacity: 1,
};

const DEFAULT_IMAGE_MATERIAL = {
  color: '#ffffff',
  roughness: 0.7,
  metalness: 0,
  opacity: 1,
};

const DEFAULT_ANNOTATION_MATERIAL = {
  color: '#ffffff',
  roughness: 0.5,
  metalness: 0,
  opacity: 1,
};

const makeId = () => crypto.randomUUID();

const offsetPosition = (position: Vec3): Vec3 => [position[0] + 0.35, position[1], position[2] + 0.35];

const primitiveNames: Record<PrimitiveKind, string> = {
  cube: 'Cube',
  cylinder: 'Cylinder',
  sphere: 'Sphere',
  plane: 'Plane',
};

const annotationNames: Record<AnnotationKind, string> = {
  'text-label': 'Text Label',
  'arrow-callout': 'Arrow Callout',
  'dimension-line': 'Dimension Line',
  'marker-dot': 'Marker Dot',
};

const DEFAULT_SETTINGS: StudioSettings = {
  backgroundMode: 'dark',
  floorVisible: true,
  gridVisible: true,
  shadowsEnabled: true,
  screenshotSize: 'viewport',
  exportFileName: '',
  exportFileNameEdited: false,
};

const createBuiltInAssetObject = (assetId: string, existingObjects: StudioObject[]): StudioObject | null => {
  const asset = builtInAssets.find((candidate) => candidate.id === assetId);
  if (!asset) return null;

  const count = existingObjects.filter((object) => object.assetId === asset.id).length + 1;

  return {
    id: makeId(),
    name: `${asset.name} ${count}`,
    kind: 'asset',
    assetId: asset.id,
    assetCategory: asset.category,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: { ...asset.material },
    locked: false,
    visible: true,
    parts: asset.parts.map((part) => ({ ...part, material: part.material ? { ...part.material } : undefined })),
  };
};

const withObjectDefaults = (object: StudioObject): StudioObject => ({
  ...object,
  locked: object.locked ?? false,
  visible: object.visible ?? true,
  material: { ...DEFAULT_MATERIAL, ...object.material },
  imagePlane: object.imagePlane
    ? {
        fileName: object.imagePlane.fileName,
        imageDataUrl: object.imagePlane.imageDataUrl,
        width: object.imagePlane.width || 1000,
        height: object.imagePlane.height || 1000,
        opacity: object.imagePlane.opacity ?? 1,
        doubleSided: object.imagePlane.doubleSided ?? true,
        preserveAspectRatio: object.imagePlane.preserveAspectRatio ?? true,
        tintColor: object.imagePlane.tintColor ?? '#ffffff',
        placeholder: object.imagePlane.placeholder ?? false,
      }
    : undefined,
  annotation: object.annotation
    ? {
        kind: object.annotation.kind ?? 'text-label',
        text: object.annotation.text ?? 'Label',
        color: object.annotation.color ?? '#ffffff',
        fontSize: object.annotation.fontSize ?? 0.16,
        backgroundEnabled: object.annotation.backgroundEnabled ?? false,
        faceCamera: object.annotation.faceCamera ?? false,
        start: object.annotation.start ?? [-0.6, 0, 0],
        end: object.annotation.end ?? [0.6, 0, 0],
        lineThickness: object.annotation.lineThickness ?? 0.025,
        arrowLength: object.annotation.arrowLength ?? 1,
        arrowAngle: object.annotation.arrowAngle ?? 0,
        autoLength: object.annotation.autoLength ?? true,
      }
    : undefined,
  parts: object.parts?.map((part) => ({ ...part, material: part.material ? { ...part.material } : undefined })),
});

export const useStudioStore = create<StudioState>((set, get) => ({
  objects: [],
  importedAssetHistory: [],
  importedImageHistory: [],
  projectTitle: 'Untitled Product Render',
  projectNotes: '',
  isDirty: false,
  selectedObjectId: null,
  transformMode: 'translate',
  cameraPreset: 'isometric',
  cameraDistance: 6,
  cameraResetToken: 0,
  frameRequest: null,
  exportRequestToken: 0,
  settings: DEFAULT_SETTINGS,

  addPrimitive: (kind) => {
    const count = get().objects.filter((object) => object.kind === kind).length + 1;
    const object: StudioObject = {
      id: makeId(),
      name: `${primitiveNames[kind]} ${count}`,
      kind,
      position: kind === 'plane' ? [0, 0.01, 0] : [0, 0.5, 0],
      rotation: kind === 'plane' ? [-Math.PI / 2, 0, 0] : [0, 0, 0],
      scale: kind === 'plane' ? [3, 3, 1] : [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      locked: false,
      visible: true,
    };
    set((state) => ({ objects: [...state.objects, object], selectedObjectId: object.id, isDirty: true }));
  },

  addModel: (fileName, modelDataUrl) => {
    const name = fileName.replace(/\.(glb|gltf)$/i, '') || 'Imported Model';
    const object: StudioObject = {
      id: makeId(),
      name,
      kind: 'model',
      assetCategory: 'Imported Models',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      locked: false,
      visible: true,
      modelDataUrl,
      fileName,
    };
    const historyItem: ImportedAssetHistoryItem = { id: makeId(), name, fileName, modelDataUrl };
    set((state) => ({
      objects: [...state.objects, object],
      importedAssetHistory: [...state.importedAssetHistory, historyItem],
      selectedObjectId: object.id,
      isDirty: true,
    }));
  },

  addImagePlane: (fileName, imageDataUrl, width, height) => {
    const name = fileName.replace(/\.(png|jpe?g|webp)$/i, '') || 'Image Plane';
    const aspect = width > 0 && height > 0 ? width / height : 1;
    const object: StudioObject = {
      id: makeId(),
      name,
      kind: 'image',
      assetCategory: 'Image / Decal',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [aspect, 1, 1],
      material: { ...DEFAULT_IMAGE_MATERIAL },
      imagePlane: {
        imageDataUrl,
        fileName,
        width,
        height,
        opacity: 1,
        doubleSided: true,
        preserveAspectRatio: true,
        tintColor: '#ffffff',
        placeholder: false,
      },
      locked: false,
      visible: true,
      fileName,
    };
    const historyItem: ImportedImageHistoryItem = { id: makeId(), name, fileName, imageDataUrl, width, height };
    set((state) => ({
      objects: [...state.objects, object],
      importedImageHistory: [...state.importedImageHistory, historyItem],
      selectedObjectId: object.id,
      isDirty: true,
    }));
  },

  addAnnotation: (kind) => {
    const count = get().objects.filter((object) => object.annotation?.kind === kind).length + 1;
    const baseName = annotationNames[kind];
    const object: StudioObject = {
      id: makeId(),
      name: `${baseName} ${count}`,
      kind: 'annotation',
      position: [0, 1.2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_ANNOTATION_MATERIAL },
      annotation: {
        kind,
        text: kind === 'dimension-line' ? '' : baseName,
        color: kind === 'marker-dot' ? '#00aeef' : '#ffffff',
        fontSize: kind === 'marker-dot' ? 0.12 : 0.16,
        backgroundEnabled: kind === 'text-label',
        faceCamera: kind === 'text-label' || kind === 'arrow-callout',
        start: [-0.6, 0, 0],
        end: [0.6, 0, 0],
        lineThickness: 0.025,
        arrowLength: 1,
        arrowAngle: 0,
        autoLength: kind === 'dimension-line',
      },
      locked: false,
      visible: true,
    };

    set((state) => ({ objects: [...state.objects, object], selectedObjectId: object.id, isDirty: true }));
  },

  addBuiltInAsset: (assetId) => {
    const object = createBuiltInAssetObject(assetId, get().objects);
    if (!object) return;

    set((state) => ({ objects: [...state.objects, object], selectedObjectId: object.id, isDirty: true }));
  },

  addImageDecalAsset: (assetId) => {
    const asset = imageDecalAssets.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    const count = get().objects.filter((object) => object.assetId === asset.id).length + 1;
    const object: StudioObject = {
      id: makeId(),
      name: `${asset.name} ${count}`,
      kind: 'image',
      assetId: asset.id,
      assetCategory: 'Image / Decal',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [asset.aspectRatio, 1, 1],
      material: { ...DEFAULT_IMAGE_MATERIAL, color: asset.tintColor, opacity: asset.opacity },
      imagePlane: {
        width: Math.round(asset.aspectRatio * 1000),
        height: 1000,
        opacity: asset.opacity,
        doubleSided: true,
        preserveAspectRatio: true,
        tintColor: asset.tintColor,
        placeholder: true,
      },
      locked: false,
      visible: true,
    };

    set((state) => ({ objects: [...state.objects, object], selectedObjectId: object.id, isDirty: true }));
  },

  addImportedAsset: (assetId) => {
    const asset = get().importedAssetHistory.find((candidate) => candidate.id === assetId);
    if (!asset) return;

    const count = get().objects.filter((object) => object.fileName === asset.fileName).length + 1;
    const object: StudioObject = {
      id: makeId(),
      name: `${asset.name} ${count}`,
      kind: 'model',
      assetCategory: 'Imported Models',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...DEFAULT_MATERIAL },
      locked: false,
      visible: true,
      modelDataUrl: asset.modelDataUrl,
      fileName: asset.fileName,
    };

    set((state) => ({ objects: [...state.objects, object], selectedObjectId: object.id, isDirty: true }));
  },

  addImportedImage: (assetId) => {
    const asset = get().importedImageHistory.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    const count = get().objects.filter((object) => object.fileName === asset.fileName).length + 1;
    const aspect = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 1;
    const object: StudioObject = {
      id: makeId(),
      name: `${asset.name} ${count}`,
      kind: 'image',
      assetCategory: 'Image / Decal',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [aspect, 1, 1],
      material: { ...DEFAULT_IMAGE_MATERIAL },
      imagePlane: {
        imageDataUrl: asset.imageDataUrl,
        fileName: asset.fileName,
        width: asset.width,
        height: asset.height,
        opacity: 1,
        doubleSided: true,
        preserveAspectRatio: true,
        tintColor: '#ffffff',
        placeholder: false,
      },
      locked: false,
      visible: true,
      fileName: asset.fileName,
    };

    set((state) => ({ objects: [...state.objects, object], selectedObjectId: object.id, isDirty: true }));
  },

  applyProjectTemplate: (templateId) => {
    const template = getProjectTemplate(templateId);
    if (!template) return;

    const starterObjects = template.starterAssetIds.reduce<StudioObject[]>((objects, assetId) => {
      const object = createBuiltInAssetObject(assetId, objects);
      return object ? [...objects, object] : objects;
    }, []);

    set({
      objects: starterObjects,
      projectTitle: template.title,
      projectNotes: template.notes,
      selectedObjectId: starterObjects[0]?.id ?? null,
      cameraPreset: template.cameraPreset,
      cameraDistance: template.cameraDistance,
      cameraResetToken: get().cameraResetToken + 1,
      frameRequest: starterObjects.length > 0 ? { target: 'all', token: (get().frameRequest?.token ?? 0) + 1 } : null,
      settings: { ...DEFAULT_SETTINGS, ...template.settings, exportFileName: '', exportFileNameEdited: false },
      isDirty: false,
    });
  },

  clearScene: () =>
    set((state) => ({
      objects: [],
      selectedObjectId: null,
      isDirty: true,
      settings: { ...state.settings, exportFileName: '', exportFileNameEdited: false },
    })),

  markSaved: () => set({ isDirty: false }),

  selectObject: (id) => set({ selectedObjectId: id }),

  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, ...patch } : object)),
      isDirty: true,
    })),

  updateObjectTransform: (id, transform) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, ...transform } : object)),
      isDirty: true,
    })),

  updateObjectMaterial: (id, material) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? { ...object, material: { ...object.material, ...material } } : object,
      ),
      isDirty: true,
    })),

  deleteSelected: () => {
    const selectedObjectId = get().selectedObjectId;
    if (!selectedObjectId) return;
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== selectedObjectId),
      selectedObjectId: null,
      isDirty: true,
    }));
  },

  duplicateSelected: () => {
    const selected = get().objects.find((object) => object.id === get().selectedObjectId);
    if (!selected) return;
    const duplicate: StudioObject = {
      ...selected,
      id: makeId(),
      name: `${selected.name} Copy`,
      position: offsetPosition(selected.position),
      material: { ...selected.material },
      imagePlane: selected.imagePlane ? { ...selected.imagePlane } : undefined,
      annotation: selected.annotation ? { ...selected.annotation } : undefined,
      parts: selected.parts?.map((part) => ({ ...part, material: part.material ? { ...part.material } : undefined })),
    };
    set((state) => ({ objects: [...state.objects, duplicate], selectedObjectId: duplicate.id, isDirty: true }));
  },

  setTransformMode: (mode) => set({ transformMode: mode }),
  setCameraPreset: (preset) => set((state) => ({ cameraPreset: preset, cameraResetToken: state.cameraResetToken + 1, isDirty: true })),
  setCameraDistance: (distance) => set((state) => ({ cameraDistance: distance, cameraResetToken: state.cameraResetToken + 1, isDirty: true })),
  resetCamera: () => set((state) => ({ cameraPreset: 'isometric', cameraDistance: 6, cameraResetToken: state.cameraResetToken + 1, isDirty: true })),
  requestFrame: (target) => set((state) => ({ frameRequest: { target, token: (state.frameRequest?.token ?? 0) + 1 } })),
  requestExportScreenshot: () => set((state) => ({ exportRequestToken: state.exportRequestToken + 1 })),
  applySceneTemplate: (template) =>
    set((state) => {
      const next = sceneTemplates[template];
      return {
        cameraPreset: next.cameraPreset,
        cameraResetToken: state.cameraResetToken + 1,
        settings: { ...state.settings, ...next.settings },
        isDirty: true,
      };
    }),
  applyProductRenderPreset: (preset) =>
    set((state) => {
      const next = productRenderPresets[preset];
      const frameTarget = next.frameTarget === 'selected' && !state.selectedObjectId ? 'all' : next.frameTarget;

      return {
        cameraPreset: next.cameraPreset,
        cameraResetToken: state.cameraResetToken + 1,
        frameRequest: { target: frameTarget, token: (state.frameRequest?.token ?? 0) + 1 },
        settings: { ...state.settings, ...next.settings },
        isDirty: true,
      };
    }),
  updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings }, isDirty: true })),
  updateExportFileName: (fileName) =>
    set((state) => ({ settings: { ...state.settings, exportFileName: fileName, exportFileNameEdited: true }, isDirty: true })),
  updateProjectInfo: (info) => set((state) => ({ ...state, ...info, isDirty: true })),
  loadProject: (project) =>
    set({
      objects: project.objects.map(withObjectDefaults),
      settings: { ...DEFAULT_SETTINGS, ...project.settings },
      projectTitle: project.title || 'Untitled Product Render',
      projectNotes: project.notes || '',
      cameraDistance: 6,
      selectedObjectId: null,
      isDirty: false,
    }),
}));
