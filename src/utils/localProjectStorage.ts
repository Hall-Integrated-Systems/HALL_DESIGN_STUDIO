import type { BackgroundMode, CameraPreset, ScreenshotSize, StudioProject } from '../types/studioTypes';

const DB_NAME = 'hall-product-studio';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const DRAFT_STORE = 'drafts';
const PRESET_STORE = 'renderPresets';
const AUTOSAVE_DRAFT_ID = 'autosave';
const AUTOSAVE_FLAG_KEY = 'hall-product-studio.autosaveDraft';

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
