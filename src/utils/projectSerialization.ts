import type { CameraPreset, StudioGroup, StudioObject, StudioProject, StudioSettings } from '../types/studioTypes';
import { APP_VERSION } from '../config/presets';

export function createProject(
  objects: StudioObject[],
  groups: StudioGroup[],
  settings: StudioSettings,
  title: string,
  notes: string,
  cameraPreset?: CameraPreset,
  cameraDistance?: number,
): StudioProject {
  return {
    version: 1,
    appVersion: APP_VERSION,
    savedAt: new Date().toISOString(),
    title,
    notes,
    objects,
    groups,
    settings,
    cameraPreset,
    cameraDistance,
  };
}

export function downloadProject(
  objects: StudioObject[],
  groups: StudioGroup[],
  settings: StudioSettings,
  title: string,
  notes: string,
  cameraPreset?: CameraPreset,
  cameraDistance?: number,
) {
  const project = createProject(objects, groups, settings, title, notes, cameraPreset, cameraDistance);
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.download = 'hall-product-studio-project.json';
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

export async function readProjectFile(file: File): Promise<StudioProject> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error('Unsupported file type. Load a Hall Product Studio .json project file.');
  }

  let parsed: StudioProject;

  try {
    parsed = JSON.parse(await file.text()) as StudioProject;
  } catch {
    throw new Error('Could not read this JSON file. It may be damaged or not valid JSON.');
  }

  if (parsed.version !== 1 || !Array.isArray(parsed.objects)) {
    throw new Error('This project JSON is not compatible with Hall Product Studio.');
  }

  return parsed;
}

export function estimateProjectBytes(project: StudioProject): number {
  return new Blob([JSON.stringify(project)]).size;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}
