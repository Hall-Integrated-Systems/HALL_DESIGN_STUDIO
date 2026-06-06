import type { StudioObject, StudioProject, StudioSettings } from '../types/studioTypes';
import { APP_VERSION } from '../config/presets';

export function createProject(objects: StudioObject[], settings: StudioSettings, title: string, notes: string): StudioProject {
  return {
    version: 1,
    appVersion: APP_VERSION,
    savedAt: new Date().toISOString(),
    title,
    notes,
    objects,
    settings,
  };
}

export function downloadProject(objects: StudioObject[], settings: StudioSettings, title: string, notes: string) {
  const project = createProject(objects, settings, title, notes);
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.download = 'hall-product-studio-project.json';
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

export async function readProjectFile(file: File): Promise<StudioProject> {
  const text = await file.text();
  const parsed = JSON.parse(text) as StudioProject;

  if (parsed.version !== 1 || !Array.isArray(parsed.objects)) {
    throw new Error('Unsupported project file.');
  }

  return parsed;
}
