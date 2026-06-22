import type { BackgroundMode, CameraPreset, CustomAssembly, ScreenshotSize, StudioGroup, StudioObject, StudioProject, Vec3 } from '../types/studioTypes';
import { APP_VERSION } from '../config/presets';

const DB_NAME = 'hall-product-studio';
const DB_VERSION = 2;
const PROJECT_STORE = 'projects';
const DRAFT_STORE = 'drafts';
const PRESET_STORE = 'renderPresets';
const ASSEMBLY_STORE = 'customAssemblies';
const AUTOSAVE_DRAFT_ID = 'autosave';
const AUTOSAVE_FLAG_KEY = 'hall-product-studio.autosaveDraft';
export const CUSTOM_ASSEMBLIES_CHANGED_EVENT = 'hall-product-studio.customAssembliesChanged';

export interface BrowserProjectRecord {
  id: string;
  title: string;
  savedAt: string;
  appVersion?: string;
  objectCount: number;
  notesPreview: string;
  project: StudioProject;
}

export interface AutosaveDraftRecord {
  id: typeof AUTOSAVE_DRAFT_ID;
  savedAt: string;
  project: StudioProject;
}

export interface AutosaveDraftFlag {
  savedAt: string;
}

export interface CustomRenderPreset {
  id: string;
  name: string;
  createdAt: string;
  backgroundMode: BackgroundMode;
  floorVisible: boolean;
  gridVisible: boolean;
  shadowsEnabled: boolean;
  screenshotSize: ScreenshotSize;
  cameraPreset: CameraPreset;
  cameraDistance: number;
}

const createId = () => crypto.randomUUID();

const cloneAssemblyObject = (object: StudioObject, origin: Vec3): StudioObject => ({
  ...object,
  position: [
    Number((object.position[0] - origin[0]).toFixed(4)),
    Number((object.position[1] - origin[1]).toFixed(4)),
    Number((object.position[2] - origin[2]).toFixed(4)),
  ],
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

const getAssemblyOrigin = (objects: StudioObject[]): Vec3 => {
  if (objects.length === 0) return [0, 0, 0];
  const total = objects.reduce<Vec3>(
    (sum, object) => [sum[0] + object.position[0], sum[1] + object.position[1], sum[2] + object.position[2]],
    [0, 0, 0],
  );
  return [
    Number((total[0] / objects.length).toFixed(4)),
    0,
    Number((total[2] / objects.length).toFixed(4)),
  ];
};

const getCustomAssemblySortTime = (assembly: Partial<CustomAssembly>) => {
  const dateValue = assembly.updatedAt ?? assembly.createdAt;
  const time = typeof dateValue === 'string' ? Date.parse(dateValue) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
};

export function getAvailableCustomAssemblyName(
  requestedName: string,
  assemblies: Array<Partial<Pick<CustomAssembly, 'name'>>>,
) {
  const trimmedName = requestedName.trim() || 'Custom Assembly';
  const existingNames = new Set(
    assemblies
      .map((assembly) => (typeof assembly.name === 'string' ? assembly.name.trim() : ''))
      .filter((name) => name.length > 0),
  );

  if (!existingNames.has(trimmedName)) return trimmedName;

  const suffixMatch = trimmedName.match(/^(.*\S)\s+(\d+)$/);
  const baseName = suffixMatch?.[1].trim() || trimmedName;
  let index = suffixMatch ? Math.max(Number(suffixMatch[2]) + 1, 2) : 2;
  let nextName = `${baseName} ${index}`;

  while (existingNames.has(nextName)) {
    index += 1;
    nextName = `${baseName} ${index}`;
  }

  return nextName;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(PROJECT_STORE)) {
        const projectStore = database.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
        projectStore.createIndex('savedAt', 'savedAt');
      }

      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(PRESET_STORE)) {
        const presetStore = database.createObjectStore(PRESET_STORE, { keyPath: 'id' });
        presetStore.createIndex('createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains(ASSEMBLY_STORE)) {
        const assemblyStore = database.createObjectStore(ASSEMBLY_STORE, { keyPath: 'id' });
        assemblyStore.createIndex('updatedAt', 'updatedAt');
      }
    };

    request.onerror = () => reject(request.error ?? new Error('Could not open browser project storage.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);

    request.onerror = () => reject(request.error ?? new Error('Browser storage request failed.'));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Browser storage transaction failed.'));
    };
  });
}

function allFromStore<T>(storeName: string): Promise<T[]> {
  return withStore<T[]>(storeName, 'readonly', (store) => store.getAll() as IDBRequest<T[]>);
}

export function createBrowserProjectRecord(project: StudioProject, id: string = createId()): BrowserProjectRecord {
  const savedAt = new Date().toISOString();
  const title = project.title?.trim() || 'Untitled Product Render';
  const notes = project.notes?.trim() ?? '';

  return {
    id,
    title,
    savedAt,
    appVersion: project.appVersion,
    objectCount: project.objects.length,
    notesPreview: notes.length > 140 ? `${notes.slice(0, 137)}...` : notes,
    project: { ...project, title, savedAt },
  };
}

export async function saveBrowserProject(record: BrowserProjectRecord): Promise<void> {
  await withStore<IDBValidKey>(PROJECT_STORE, 'readwrite', (store) => store.put(record));
}

export async function listBrowserProjects(): Promise<BrowserProjectRecord[]> {
  const projects = await allFromStore<BrowserProjectRecord>(PROJECT_STORE);
  return projects.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getBrowserProject(id: string): Promise<BrowserProjectRecord | undefined> {
  return withStore<BrowserProjectRecord | undefined>(PROJECT_STORE, 'readonly', (store) => store.get(id));
}

export async function deleteBrowserProject(id: string): Promise<void> {
  await withStore<undefined>(PROJECT_STORE, 'readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
}

export async function duplicateBrowserProject(id: string): Promise<BrowserProjectRecord | undefined> {
  const original = await getBrowserProject(id);
  if (!original) return undefined;

  const title = `${original.title} Copy`;
  const duplicate = createBrowserProjectRecord({ ...original.project, title }, createId());
  await saveBrowserProject(duplicate);
  return duplicate;
}

export async function saveAutosaveDraft(project: StudioProject): Promise<void> {
  const savedAt = new Date().toISOString();
  const draft: AutosaveDraftRecord = {
    id: AUTOSAVE_DRAFT_ID,
    savedAt,
    project,
  };

  await withStore<IDBValidKey>(DRAFT_STORE, 'readwrite', (store) => store.put(draft));
  localStorage.setItem(AUTOSAVE_FLAG_KEY, JSON.stringify({ savedAt } satisfies AutosaveDraftFlag));
}

export function getAutosaveDraft(): Promise<AutosaveDraftRecord | undefined> {
  return withStore<AutosaveDraftRecord | undefined>(DRAFT_STORE, 'readonly', (store) => store.get(AUTOSAVE_DRAFT_ID));
}

export function getAutosaveDraftFlag(): AutosaveDraftFlag | null {
  const rawFlag = localStorage.getItem(AUTOSAVE_FLAG_KEY);
  if (!rawFlag) return null;

  try {
    return JSON.parse(rawFlag) as AutosaveDraftFlag;
  } catch {
    localStorage.removeItem(AUTOSAVE_FLAG_KEY);
    return null;
  }
}

export async function clearAutosaveDraft(): Promise<void> {
  await withStore<undefined>(DRAFT_STORE, 'readwrite', (store) => store.delete(AUTOSAVE_DRAFT_ID) as IDBRequest<undefined>);
  localStorage.removeItem(AUTOSAVE_FLAG_KEY);
}

export async function saveCustomRenderPreset(preset: Omit<CustomRenderPreset, 'id' | 'createdAt'>): Promise<CustomRenderPreset> {
  const record: CustomRenderPreset = {
    ...preset,
    id: createId(),
    createdAt: new Date().toISOString(),
  };

  await withStore<IDBValidKey>(PRESET_STORE, 'readwrite', (store) => store.put(record));
  return record;
}

export async function listCustomRenderPresets(): Promise<CustomRenderPreset[]> {
  const presets = await allFromStore<CustomRenderPreset>(PRESET_STORE);
  return presets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteCustomRenderPreset(id: string): Promise<void> {
  await withStore<undefined>(PRESET_STORE, 'readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
}

export function createCustomAssemblyRecord({
  name,
  group,
  objects,
  groups,
  id = createId(),
  existingRecord,
}: {
  name: string;
  group: StudioGroup;
  objects: StudioObject[];
  groups: StudioGroup[];
  id?: string;
  existingRecord?: CustomAssembly;
}): CustomAssembly {
  const childObjects = group.objectIds
    .map((objectId) => objects.find((object) => object.id === objectId))
    .filter((object): object is StudioObject => Boolean(object));
  const origin = getAssemblyOrigin(childObjects);
  const selectedObjectIds = new Set(group.objectIds);
  const assemblyObjects = childObjects.map((object) => cloneAssemblyObject(object, origin));
  const assemblyGroups = groups
    .filter((candidate) => candidate.id === group.id || candidate.objectIds.some((objectId) => selectedObjectIds.has(objectId)))
    .map((candidate) => ({ ...candidate, objectIds: candidate.objectIds.filter((objectId) => selectedObjectIds.has(objectId)) }))
    .filter((candidate) => candidate.objectIds.length > 0);
  const now = new Date().toISOString();

  return {
    id,
    name: name.trim() || group.name || 'Custom Assembly',
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
    appVersion: APP_VERSION,
    objects: assemblyObjects,
    groups: assemblyGroups,
    rootGroupId: group.id,
    origin,
    previewColor: childObjects[0]?.material.color,
  };
}

export async function saveCustomAssembly(assembly: CustomAssembly): Promise<void> {
  await withStore<IDBValidKey>(ASSEMBLY_STORE, 'readwrite', (store) => store.put(assembly));
}

export async function listCustomAssemblies(): Promise<CustomAssembly[]> {
  const assemblies = await allFromStore<CustomAssembly>(ASSEMBLY_STORE);
  return assemblies.sort((a, b) => getCustomAssemblySortTime(b) - getCustomAssemblySortTime(a));
}

export async function deleteCustomAssembly(id: string): Promise<void> {
  await withStore<undefined>(ASSEMBLY_STORE, 'readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
}
