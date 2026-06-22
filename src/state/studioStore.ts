import { create } from 'zustand';
import type {
  AlignmentAction,
  AnnotationKind,
  BackgroundMode,
  CameraPreset,
  CustomAssembly,
  FrameTarget,
  MountingHelperKind,
  PrimitiveKind,
  ProductRenderPreset,
  ProjectSource,
  ProjectTemplateId,
  ScreenshotSize,
  SceneTemplate,
  StudioGroup,
  StudioObject,
  StudioProject,
  StudioSettings,
  StudioToast,
  ToastTone,
  TransformMode,
  Vec3,
} from '../types/studioTypes';
import { productRenderPresets, sceneTemplates } from '../config/presets';
import { builtInAssets, imageDecalAssets } from '../config/assets';
import { getProjectTemplate } from '../config/projectTemplates';
import { getMountingHelperDefinition } from '../config/mountingHelpers';
import { trackClarityEvent } from '../utils/clarity';

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
  groups: StudioGroup[];
  importedAssetHistory: ImportedAssetHistoryItem[];
  importedImageHistory: ImportedImageHistoryItem[];
  projectTitle: string;
  projectNotes: string;
  isDirty: boolean;
  activeBrowserProjectId: string | null;
  projectSource: ProjectSource;
  referenceObjectId: string | null;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectedGroupId: string | null;
  transformMode: TransformMode;
  cameraPreset: CameraPreset;
  cameraDistance: number;
  cameraResetToken: number;
  frameRequest: { target: FrameTarget; token: number } | null;
  exportRequestToken: number;
  isExporting: boolean;
  settings: StudioSettings;
  toasts: StudioToast[];
  addPrimitive: (kind: PrimitiveKind) => void;
  addModel: (fileName: string, modelDataUrl: string) => void;
  addImagePlane: (fileName: string, imageDataUrl: string, width: number, height: number) => void;
  addAnnotation: (kind: AnnotationKind) => void;
  addMountingHelper: (kind: MountingHelperKind) => void;
  addBuiltInAsset: (assetId: string) => void;
  addImageDecalAsset: (assetId: string) => void;
  addImportedAsset: (assetId: string) => void;
  addImportedImage: (assetId: string) => void;
  addCustomAssemblyToScene: (assembly: CustomAssembly) => void;
  applyProjectTemplate: (templateId: ProjectTemplateId) => void;
  clearScene: () => void;
  markSaved: () => void;
  setActiveBrowserProjectId: (id: string | null) => void;
  setReferenceObject: (id: string | null) => void;
  selectObject: (id: string | null) => void;
  toggleObjectSelection: (id: string) => void;
  selectOnlyObject: (id: string | null) => void;
  selectGroup: (id: string | null) => void;
  clearSelection: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  updateGroup: (id: string, patch: Partial<StudioGroup>) => void;
  alignSelectedObject: (action: AlignmentAction) => void;
  updateObject: (id: string, patch: Partial<StudioObject>) => void;
  updateObjectTransform: (id: string, transform: Partial<Pick<StudioObject, 'position' | 'rotation' | 'scale'>>) => void;
  updateGroupTransform: (id: string, startCenter: Vec3, nextCenter: Vec3) => void;
  updateObjectMaterial: (id: string, material: Partial<StudioObject['material']>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  setTransformMode: (mode: TransformMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setCameraDistance: (distance: number) => void;
  resetCamera: () => void;
  requestFrame: (target: FrameTarget) => void;
  requestExportScreenshot: () => void;
  completeExportScreenshot: () => void;
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  applySceneTemplate: (template: SceneTemplate) => void;
  applyProductRenderPreset: (preset: ProductRenderPreset) => void;
  updateSettings: (settings: Partial<StudioSettings>) => void;
  updateExportFileName: (fileName: string) => void;
  updateProjectInfo: (info: Partial<Pick<StudioState, 'projectTitle' | 'projectNotes'>>) => void;
  loadProject: (project: StudioProject, browserProjectId?: string | null, source?: ProjectSource) => void;
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

const offsetPosition = (position: Vec3, offset: number): Vec3 => [position[0] + offset, position[1], position[2] + offset];

const snapValue = (value: number, snapSize: number) => Number((Math.round(value / snapSize) * snapSize).toFixed(4));

const snapVector = (vector: Vec3, settings: StudioSettings): Vec3 =>
  settings.snapToGrid ? ([snapValue(vector[0], settings.gridSnapSize), snapValue(vector[1], settings.gridSnapSize), snapValue(vector[2], settings.gridSnapSize)] as Vec3) : vector;

const vec3 = (x: number, y: number, z: number): Vec3 => [x, y, z];

const snapChangedAxes = (current: Vec3, next: Vec3, settings: StudioSettings): Vec3 => {
  if (!settings.snapToGrid) return next;
  return next.map((value, index) => (Math.abs(value - current[index]) > 0.0001 ? snapValue(value, settings.gridSnapSize) : current[index])) as Vec3;
};

const applyPositionRules = (current: Vec3, next: Vec3, settings: StudioSettings): Vec3 => {
  const snapped = snapChangedAxes(current, next, settings);
  if (settings.axisMoveLock === 'x') return [snapped[0], current[1], current[2]];
  if (settings.axisMoveLock === 'y') return [current[0], snapped[1], current[2]];
  if (settings.axisMoveLock === 'z') return [current[0], current[1], snapped[2]];
  return snapped;
};

const getDuplicatePosition = (position: Vec3, settings: StudioSettings): Vec3 => {
  const offset = settings.duplicateOffset;
  if (settings.axisMoveLock === 'x') return snapVector([position[0] + offset, position[1], position[2]], settings);
  if (settings.axisMoveLock === 'y') return snapVector([position[0], position[1] + offset, position[2]], settings);
  if (settings.axisMoveLock === 'z') return snapVector([position[0], position[1], position[2] + offset], settings);
  return snapVector(offsetPosition(position, offset), settings);
};

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
  selectionMode: 'canvas-select-move',
  moveSelectedOnly: false,
  ignoreLockedObjectsInCanvasSelection: false,
  axisHelperVisible: true,
  axisMoveLock: 'free',
  snapToGrid: false,
  gridSnapSize: 0.25,
  duplicateOffset: 0.35,
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
    appearance: asset.appearance ? { ...asset.appearance } : undefined,
    locked: false,
    visible: true,
    parts: asset.parts.map((part) => ({ ...part, material: part.material ? { ...part.material } : undefined })),
  };
};

const getAppearanceWithDefaults = (
  object: StudioObject,
  material: StudioObject['material'],
  imagePlane: StudioObject['imagePlane'],
): StudioObject['appearance'] => {
  if (object.assetId === 'label-tag') {
    return {
      ...object.appearance,
      fillColor: object.appearance?.fillColor ?? material.color,
      foregroundColor:
        object.appearance?.foregroundColor ?? object.parts?.find((part) => part.id === 'stripe')?.material?.color ?? '#0057a8',
    };
  }

  if (imagePlane) {
    return {
      ...object.appearance,
      fillColor: object.appearance?.fillColor ?? imagePlane.tintColor,
    };
  }

  return object.appearance ? { ...object.appearance } : undefined;
};

const withObjectDefaults = (object: StudioObject): StudioObject => {
  const material = { ...DEFAULT_MATERIAL, ...object.material };
  const imagePlane = object.imagePlane
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
    : undefined;

  return {
    ...object,
    locked: object.locked ?? false,
    visible: object.visible ?? true,
    material,
    appearance: getAppearanceWithDefaults(object, material, imagePlane),
    imagePlane,
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
    mountingHelper: object.mountingHelper
    ? {
        kind: object.mountingHelper.kind ?? 'round-hole',
        diameter: object.mountingHelper.diameter ?? 0.42,
        slotLength: object.mountingHelper.slotLength ?? 0.9,
        slotWidth: object.mountingHelper.slotWidth ?? 0.28,
        standoffHeight: object.mountingHelper.standoffHeight ?? 0.65,
        clearanceSize: object.mountingHelper.clearanceSize ?? [1.4, 0.05, 1.1],
      }
      : undefined,
    parts: object.parts?.map((part) => ({ ...part, material: part.material ? { ...part.material } : undefined })),
  };
};

const cloneObject = (object: StudioObject, name: string, settings: StudioSettings): StudioObject => ({
  ...object,
  id: makeId(),
  name,
  position: getDuplicatePosition(object.position, settings),
  material: { ...object.material },
  appearance: object.appearance ? { ...object.appearance } : undefined,
  imagePlane: object.imagePlane ? { ...object.imagePlane } : undefined,
  annotation: object.annotation ? { ...object.annotation } : undefined,
  mountingHelper: object.mountingHelper ? { ...object.mountingHelper, clearanceSize: [...object.mountingHelper.clearanceSize] } : undefined,
  parts: object.parts?.map((part) => ({ ...part, material: part.material ? { ...part.material } : undefined })),
});

const cloneObjectAtPosition = (object: StudioObject, id: string, name: string, position: Vec3): StudioObject => ({
  ...object,
  id,
  name,
  position,
  material: { ...object.material },
  appearance: object.appearance ? { ...object.appearance } : undefined,
  imagePlane: object.imagePlane ? { ...object.imagePlane } : undefined,
  annotation: object.annotation ? { ...object.annotation, start: [...object.annotation.start], end: [...object.annotation.end] } : undefined,
  mountingHelper: object.mountingHelper ? { ...object.mountingHelper, clearanceSize: [...object.mountingHelper.clearanceSize] } : undefined,
  parts: object.parts?.map((part) => ({
    ...part,
    position: [...part.position],
    rotation: [...part.rotation],
    scale: [...part.scale],
    material: part.material ? { ...part.material } : undefined,
  })),
});

const getSceneCenter = (objects: StudioObject[]): Vec3 => {
  if (objects.length === 0) return [0, 0, 0];

  const bounds = objects.reduce(
    (result, object) => ({
      minX: Math.min(result.minX, object.position[0]),
      maxX: Math.max(result.maxX, object.position[0]),
      minZ: Math.min(result.minZ, object.position[2]),
      maxZ: Math.max(result.maxZ, object.position[2]),
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minZ: Number.POSITIVE_INFINITY, maxZ: Number.NEGATIVE_INFINITY },
  );

  return [Number(((bounds.minX + bounds.maxX) / 2).toFixed(4)), 0, Number(((bounds.minZ + bounds.maxZ) / 2).toFixed(4))];
};

const getAssemblyInsertOrigin = (settings: StudioSettings, objects: StudioObject[]): Vec3 => {
  const sceneCenter = getSceneCenter(objects);
  const requestedOffset = settings.duplicateOffset > 0 ? settings.duplicateOffset : 0.35;
  const offset = settings.snapToGrid ? Math.max(requestedOffset, settings.gridSnapSize) : requestedOffset;
  return snapVector([sceneCenter[0] + offset, 0, sceneCenter[2] + offset], settings);
};

const getUniqueName = (baseName: string, existingNames: Set<string>) => {
  const trimmed = baseName.trim() || 'Assembly';
  if (!existingNames.has(trimmed)) return trimmed;

  let index = 2;
  let name = `${trimmed} ${index}`;

  while (existingNames.has(name)) {
    index += 1;
    name = `${trimmed} ${index}`;
  }

  return name;
};

const sanitizeGroups = (objects: StudioObject[], groups: StudioGroup[] | undefined): StudioGroup[] => {
  if (!Array.isArray(groups)) return [];

  const objectIds = new Set(objects.map((object) => object.id));
  const assignedObjectIds = new Set<string>();
  const usedGroupIds = new Set<string>();

  return groups.reduce<StudioGroup[]>((sanitized, group, index) => {
    if (!group || !Array.isArray(group.objectIds)) return sanitized;

    const validObjectIds = group.objectIds.filter((objectId) => {
      if (!objectIds.has(objectId) || assignedObjectIds.has(objectId)) return false;
      assignedObjectIds.add(objectId);
      return true;
    });

    if (validObjectIds.length === 0) return sanitized;

    const fallbackId = makeId();
    const id = group.id && !usedGroupIds.has(group.id) ? group.id : fallbackId;
    usedGroupIds.add(id);

    sanitized.push({
      id,
      name: group.name?.trim() || `Group ${index + 1}`,
      objectIds: validObjectIds,
      locked: group.locked ?? false,
      visible: group.visible ?? true,
    });

    return sanitized;
  }, []);
};

const removeObjectIdsFromGroups = (groups: StudioGroup[], objectIds: Set<string>): StudioGroup[] =>
  groups
    .map((group) => ({ ...group, objectIds: group.objectIds.filter((objectId) => !objectIds.has(objectId)) }))
    .filter((group) => group.objectIds.length > 0);

const getNextGroupName = (groups: StudioGroup[]) => {
  const existingNames = new Set(groups.map((group) => group.name));
  let index = groups.length + 1;
  let name = `Group ${index}`;

  while (existingNames.has(name)) {
    index += 1;
    name = `Group ${index}`;
  }

  return name;
};

const getConstrainedGroupDelta = (settings: StudioSettings, startCenter: Vec3, nextCenter: Vec3): Vec3 => {
  const constrained = applyPositionRules(startCenter, nextCenter, settings);
  return [
    Number((constrained[0] - startCenter[0]).toFixed(4)),
    Number((constrained[1] - startCenter[1]).toFixed(4)),
    Number((constrained[2] - startCenter[2]).toFixed(4)),
  ];
};

const getSelectionPatch = (objectIds: string[], selectedGroupId: string | null = null) => ({
  selectedObjectIds: objectIds,
  selectedObjectId: objectIds.length === 1 && !selectedGroupId ? objectIds[0] : null,
  selectedGroupId,
});

export const useStudioStore = create<StudioState>((set, get) => ({
  objects: [],
  groups: [],
  importedAssetHistory: [],
  importedImageHistory: [],
  projectTitle: 'Untitled Product Render',
  projectNotes: '',
  isDirty: false,
  activeBrowserProjectId: null,
  projectSource: 'new',
  referenceObjectId: null,
  selectedObjectId: null,
  selectedObjectIds: [],
  selectedGroupId: null,
  transformMode: 'translate',
  cameraPreset: 'isometric',
  cameraDistance: 6,
  cameraResetToken: 0,
  frameRequest: null,
  exportRequestToken: 0,
  isExporting: false,
  settings: DEFAULT_SETTINGS,
  toasts: [],

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
    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
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
      ...getSelectionPatch([object.id]),
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
      appearance: { fillColor: '#ffffff' },
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
      ...getSelectionPatch([object.id]),
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

    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
  },

  addMountingHelper: (kind) => {
    const definition = getMountingHelperDefinition(kind);
    if (!definition) return;

    const count = get().objects.filter((object) => object.mountingHelper?.kind === kind).length + 1;
    const isFlatHelper = kind !== 'standoff' && kind !== 'bolt-head';
    const object: StudioObject = {
      id: makeId(),
      name: `${definition.baseName} ${count}`,
      kind: 'mounting-helper',
      assetCategory: 'Mounting Helpers',
      position: kind === 'standoff' ? [0, definition.standoffHeight / 2, 0] : [0, 0.04, 0],
      rotation: isFlatHelper ? [-Math.PI / 2, 0, 0] : [0, 0, 0],
      scale: [1, 1, 1],
      material: { ...definition.material },
      mountingHelper: {
        kind,
        diameter: definition.diameter,
        slotLength: definition.slotLength,
        slotWidth: definition.slotWidth,
        standoffHeight: definition.standoffHeight,
        clearanceSize: [...definition.clearanceSize],
      },
      locked: false,
      visible: true,
    };

    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
  },

  addBuiltInAsset: (assetId) => {
    const object = createBuiltInAssetObject(assetId, get().objects);
    if (!object) return;

    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
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
      appearance: { fillColor: asset.tintColor },
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

    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
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

    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
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
      appearance: { fillColor: '#ffffff' },
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

    set((state) => ({ objects: [...state.objects, object], ...getSelectionPatch([object.id]), isDirty: true }));
  },

  addCustomAssemblyToScene: (assembly) =>
    set((state) => {
      const assemblyObjects = Array.isArray(assembly.objects)
        ? assembly.objects.filter((object): object is StudioObject => Boolean(object) && Array.isArray(object.position))
        : [];
      const assemblyGroups = Array.isArray(assembly.groups)
        ? assembly.groups.filter((group): group is StudioGroup => Boolean(group) && Array.isArray(group.objectIds))
        : [];
      if (assemblyObjects.length === 0 || assemblyGroups.length === 0) return state;

      const objectIdMap = new Map<string, string>();
      const groupIdMap = new Map<string, string>();
      const existingObjectNames = new Set(state.objects.map((object) => object.name));
      const existingGroupNames = new Set(state.groups.map((group) => group.name));
      const insertOrigin = getAssemblyInsertOrigin(state.settings, state.objects);

      const nextObjects = assemblyObjects.map((object) => {
        const id = makeId();
        objectIdMap.set(object.id, id);
        const name = getUniqueName(object.name, existingObjectNames);
        existingObjectNames.add(name);
        return cloneObjectAtPosition(object, id, name, [
          Number((object.position[0] + insertOrigin[0]).toFixed(4)),
          Number((object.position[1] + insertOrigin[1]).toFixed(4)),
          Number((object.position[2] + insertOrigin[2]).toFixed(4)),
        ]);
      });

      const nextGroups = assemblyGroups
        .map((group) => {
          const id = makeId();
          groupIdMap.set(group.id, id);
          const name = getUniqueName(group.id === assembly.rootGroupId ? assembly.name : group.name, existingGroupNames);
          existingGroupNames.add(name);
          return {
            ...group,
            id,
            name,
            objectIds: group.objectIds.map((objectId) => objectIdMap.get(objectId)).filter((objectId): objectId is string => Boolean(objectId)),
          };
        })
        .filter((group) => group.objectIds.length > 0);

      const selectedGroupId = groupIdMap.get(assembly.rootGroupId) ?? nextGroups[0]?.id ?? null;

      return {
        objects: [...state.objects, ...nextObjects],
        groups: [...state.groups, ...nextGroups],
        ...getSelectionPatch([], selectedGroupId),
        isDirty: true,
      };
    }),

  applyProjectTemplate: (templateId) => {
    const template = getProjectTemplate(templateId);
    if (!template) return;

    const starterObjects = template.starterAssetIds.reduce<StudioObject[]>((objects, assetId) => {
      const object = createBuiltInAssetObject(assetId, objects);
      return object ? [...objects, object] : objects;
    }, []);

    set({
      objects: starterObjects,
      groups: [],
      projectTitle: template.title,
      projectNotes: template.notes,
      ...getSelectionPatch(starterObjects[0] ? [starterObjects[0].id] : []),
      cameraPreset: template.cameraPreset,
      cameraDistance: template.cameraDistance,
      cameraResetToken: get().cameraResetToken + 1,
      frameRequest: starterObjects.length > 0 ? { target: 'all', token: (get().frameRequest?.token ?? 0) + 1 } : null,
      settings: { ...DEFAULT_SETTINGS, ...template.settings, exportFileName: '', exportFileNameEdited: false },
      isDirty: false,
      activeBrowserProjectId: null,
      projectSource: 'new',
      referenceObjectId: null,
    });
  },

  clearScene: () =>
    set((state) => ({
      objects: [],
      groups: [],
      ...getSelectionPatch([]),
      isDirty: true,
      activeBrowserProjectId: null,
      projectSource: 'new',
      referenceObjectId: null,
      settings: { ...state.settings, exportFileName: '', exportFileNameEdited: false },
    })),

  markSaved: () => set({ isDirty: false }),
  setActiveBrowserProjectId: (id) => set({ activeBrowserProjectId: id, projectSource: id ? 'browser' : 'new' }),
  setReferenceObject: (id) => set({ referenceObjectId: id }),

  selectObject: (id) => set(getSelectionPatch(id ? [id] : [])),
  selectOnlyObject: (id) => set(getSelectionPatch(id ? [id] : [])),
  toggleObjectSelection: (id) =>
    set((state) => {
      if (!state.objects.some((object) => object.id === id)) return state;
      const selectedIds = new Set(state.selectedObjectIds);

      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else {
        selectedIds.add(id);
      }

      return getSelectionPatch([...selectedIds]);
    }),
  selectGroup: (id) =>
    set((state) => {
      if (!id) return getSelectionPatch([]);
      const group = state.groups.find((candidate) => candidate.id === id);
      return group ? getSelectionPatch([], group.id) : state;
    }),
  clearSelection: () => set(getSelectionPatch([])),
  groupSelected: () =>
    set((state) => {
      const selectedIds = state.selectedObjectIds.filter((objectId) => state.objects.some((object) => object.id === objectId));
      if (selectedIds.length < 2) return state;

      const selectedIdSet = new Set(selectedIds);
      const groupsWithoutSelectedObjects = removeObjectIdsFromGroups(state.groups, selectedIdSet);
      const group: StudioGroup = {
        id: makeId(),
        name: getNextGroupName(groupsWithoutSelectedObjects),
        objectIds: selectedIds,
        locked: false,
        visible: true,
      };

      return {
        groups: [...groupsWithoutSelectedObjects, group],
        ...getSelectionPatch([], group.id),
        isDirty: true,
      };
    }),
  ungroupSelected: () =>
    set((state) => {
      if (!state.selectedGroupId) return state;
      const group = state.groups.find((candidate) => candidate.id === state.selectedGroupId);
      return {
        groups: state.groups.filter((candidate) => candidate.id !== state.selectedGroupId),
        ...getSelectionPatch(group?.objectIds ?? []),
        isDirty: true,
      };
    }),
  updateGroup: (id, patch) =>
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id
          ? {
              ...group,
              ...patch,
              name: patch.name ?? group.name,
              objectIds: patch.objectIds ?? group.objectIds,
            }
          : group,
      ),
      isDirty: true,
    })),

  alignSelectedObject: (action) =>
    set((state) => {
      const selected = state.objects.find((object) => object.id === state.selectedObjectId);
      if (!selected) return state;
      const reference = state.objects.find((object) => object.id === state.referenceObjectId);
      if (action !== 'center-origin' && !reference) return state;

      const nextObjects = state.objects.map((object) => {
        if (object.id !== selected.id) return object;
        if (action === 'center-origin') return { ...object, position: snapVector([0, object.position[1], 0], state.settings) };
        if (!reference) return object;
        if (action === 'align-x') return { ...object, position: snapVector([reference.position[0], object.position[1], object.position[2]], state.settings) };
        if (action === 'align-y' || action === 'match-height') return { ...object, position: snapVector([object.position[0], reference.position[1], object.position[2]], state.settings) };
        if (action === 'align-z') return { ...object, position: snapVector([object.position[0], object.position[1], reference.position[2]], state.settings) };
        if (action === 'match-scale-x') return { ...object, scale: vec3(reference.scale[0], object.scale[1], object.scale[2]) };
        if (action === 'match-scale-y') return { ...object, scale: vec3(object.scale[0], reference.scale[1], object.scale[2]) };
        if (action === 'match-scale-z') return { ...object, scale: vec3(object.scale[0], object.scale[1], reference.scale[2]) };
        return object;
      });

      return { objects: nextObjects, isDirty: true };
    }),

  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.id === id ? { ...object, ...patch } : object)),
      isDirty: true,
    })),

  updateObjectTransform: (id, transform) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id
          ? {
              ...object,
              ...transform,
              position: transform.position ? applyPositionRules(object.position, transform.position, state.settings) : object.position,
            }
          : object,
      ),
      isDirty: true,
    })),

  updateGroupTransform: (id, startCenter, nextCenter) =>
    set((state) => {
      const group = state.groups.find((candidate) => candidate.id === id);
      if (!group || group.locked) return state;

      const delta = getConstrainedGroupDelta(state.settings, startCenter, nextCenter);
      if (delta.every((value) => Math.abs(value) <= 0.0001)) return state;

      const groupObjectIds = new Set(group.objectIds);
      return {
        objects: state.objects.map((object) =>
          groupObjectIds.has(object.id)
            ? {
                ...object,
                position: [
                  Number((object.position[0] + delta[0]).toFixed(4)),
                  Number((object.position[1] + delta[1]).toFixed(4)),
                  Number((object.position[2] + delta[2]).toFixed(4)),
                ],
              }
            : object,
        ),
        isDirty: true,
      };
    }),

  updateObjectMaterial: (id, material) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? { ...object, material: { ...object.material, ...material } } : object,
      ),
      isDirty: true,
    })),

  deleteSelected: () => {
    const { selectedGroupId, selectedObjectIds } = get();
    if (!selectedGroupId && selectedObjectIds.length === 0) return;

    set((state) => {
      const selectedGroup = selectedGroupId ? state.groups.find((group) => group.id === selectedGroupId) : null;
      const deletedObjectIds = new Set(selectedGroup ? selectedGroup.objectIds : selectedObjectIds);

      return {
        objects: state.objects.filter((object) => !deletedObjectIds.has(object.id)),
        groups: selectedGroup
          ? state.groups.filter((group) => group.id !== selectedGroup.id)
          : removeObjectIdsFromGroups(state.groups, deletedObjectIds),
        ...getSelectionPatch([]),
        isDirty: true,
      };
    });
  },

  duplicateSelected: () => {
    set((state) => {
      if (state.selectedGroupId) {
        const selectedGroup = state.groups.find((group) => group.id === state.selectedGroupId);
        if (!selectedGroup) return state;

        const childObjects = selectedGroup.objectIds
          .map((objectId) => state.objects.find((object) => object.id === objectId))
          .filter((object): object is StudioObject => Boolean(object));
        if (childObjects.length === 0) return state;

        const idMap = new Map<string, string>();
        const duplicates = childObjects.map((object) => {
          const duplicate = cloneObject(object, `${object.name} Copy`, state.settings);
          idMap.set(object.id, duplicate.id);
          return duplicate;
        });
        const group: StudioGroup = {
          ...selectedGroup,
          id: makeId(),
          name: `${selectedGroup.name} Copy`,
          objectIds: selectedGroup.objectIds.map((objectId) => idMap.get(objectId)).filter((objectId): objectId is string => Boolean(objectId)),
          locked: false,
        };

        return {
          objects: [...state.objects, ...duplicates],
          groups: [...state.groups, group],
          ...getSelectionPatch([], group.id),
          isDirty: true,
        };
      }

      const selectedIds = state.selectedObjectIds.length > 0 ? state.selectedObjectIds : state.selectedObjectId ? [state.selectedObjectId] : [];
      const selectedObjects = selectedIds
        .map((objectId) => state.objects.find((object) => object.id === objectId))
        .filter((object): object is StudioObject => Boolean(object));
      if (selectedObjects.length === 0) return state;

      const duplicates = selectedObjects.map((object) => cloneObject(object, `${object.name} Copy`, state.settings));

      return {
        objects: [...state.objects, ...duplicates],
        ...getSelectionPatch(duplicates.map((object) => object.id)),
        isDirty: true,
      };
    });
  },

  setTransformMode: (mode) => set({ transformMode: mode }),
  setCameraPreset: (preset) => set((state) => ({ cameraPreset: preset, cameraResetToken: state.cameraResetToken + 1, isDirty: true })),
  setCameraDistance: (distance) => set((state) => ({ cameraDistance: distance, cameraResetToken: state.cameraResetToken + 1, isDirty: true })),
  resetCamera: () => set((state) => ({ cameraPreset: 'isometric', cameraDistance: 6, cameraResetToken: state.cameraResetToken + 1, isDirty: true })),
  requestFrame: (target) => set((state) => ({ frameRequest: { target, token: (state.frameRequest?.token ?? 0) + 1 } })),
  requestExportScreenshot: () => {
    const state = get();
    if (state.isExporting) return;

    trackClarityEvent('export_started');
    trackClarityEvent('screenshot_export');
    if (state.settings.screenshotSize !== 'viewport') {
      trackClarityEvent('high_res_export');
    }

    set({ exportRequestToken: state.exportRequestToken + 1, isExporting: true });
  },
  completeExportScreenshot: () => set({ isExporting: false }),
  pushToast: (message, tone = 'info') => {
    const id = makeId();
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, message, tone }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, tone === 'error' ? 7000 : 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
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
      const hasSelection = Boolean(state.selectedObjectId || state.selectedGroupId || state.selectedObjectIds.length > 0);
      const frameTarget = next.frameTarget === 'selected' && !hasSelection ? 'all' : next.frameTarget;

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
  loadProject: (project, browserProjectId = null, source = browserProjectId ? 'browser' : 'json') =>
    set(() => {
      const objects = project.objects.map(withObjectDefaults);
      return {
        objects,
        groups: sanitizeGroups(objects, project.groups),
        settings: { ...DEFAULT_SETTINGS, ...project.settings },
        projectTitle: project.title || 'Untitled Product Render',
        projectNotes: project.notes || '',
        cameraPreset: project.cameraPreset ?? 'isometric',
        cameraDistance: project.cameraDistance ?? 6,
        cameraResetToken: get().cameraResetToken + 1,
        ...getSelectionPatch([]),
        isDirty: false,
        activeBrowserProjectId: browserProjectId,
        projectSource: source,
        referenceObjectId: null,
      };
    }),
}));
