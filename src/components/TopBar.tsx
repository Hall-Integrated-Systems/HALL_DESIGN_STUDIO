import { ChangeEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { downloadProject, readProjectFile } from '../utils/projectSerialization';
import { useStudioStore } from '../state/studioStore';
import type { BackgroundMode, CameraPreset, ProjectTemplateId, ScreenshotSize } from '../types/studioTypes';
import { productRenderPresets, sceneTemplates } from '../config/presets';
import { projectTemplates } from '../config/projectTemplates';

const cameraPresets: CameraPreset[] = ['front', 'back', 'left', 'right', 'top', 'isometric'];
const backgroundModes: BackgroundMode[] = ['dark', 'light', 'transparent'];

const screenshotSizes: Array<{ value: ScreenshotSize; label: string }> = [
  { value: 'viewport', label: 'Viewport' },
  { value: 'square-1200', label: '1200 Square' },
  { value: 'hd-1920', label: '1920 x 1080' },
  { value: 'square-2400', label: '2400 Square' },
];

export function TopBar() {
  const loadInputRef = useRef<HTMLInputElement>(null);
  const objects = useStudioStore((state) => state.objects);
  const projectTitle = useStudioStore((state) => state.projectTitle);
  const projectNotes = useStudioStore((state) => state.projectNotes);
  const isDirty = useStudioStore((state) => state.isDirty);
  const settings = useStudioStore((state) => state.settings);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedObject = useStudioStore((state) => state.objects.find((object) => object.id === selectedObjectId));
  const cameraPreset = useStudioStore((state) => state.cameraPreset);
  const cameraDistance = useStudioStore((state) => state.cameraDistance);
  const loadProject = useStudioStore((state) => state.loadProject);
  const applyProjectTemplate = useStudioStore((state) => state.applyProjectTemplate);
  const clearScene = useStudioStore((state) => state.clearScene);
  const markSaved = useStudioStore((state) => state.markSaved);
  const setCameraPreset = useStudioStore((state) => state.setCameraPreset);
  const setCameraDistance = useStudioStore((state) => state.setCameraDistance);
  const requestFrame = useStudioStore((state) => state.requestFrame);
  const requestExportScreenshot = useStudioStore((state) => state.requestExportScreenshot);
  const applySceneTemplate = useStudioStore((state) => state.applySceneTemplate);
  const applyProductRenderPreset = useStudioStore((state) => state.applyProductRenderPreset);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const updateExportFileName = useStudioStore((state) => state.updateExportFileName);
  const resetCamera = useStudioStore((state) => state.resetCamera);
  const exportFileName = settings.exportFileNameEdited ? settings.exportFileName : selectedObject?.name || 'hall-product-studio-render';

  const confirmReset = (actionLabel: string) => {
    if (objects.length === 0 && !isDirty) return true;
    const reason = isDirty ? 'You have unsaved changes.' : 'This scene contains objects.';
    return window.confirm(`${reason} ${actionLabel}?`);
  };

  const handleLoadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      loadProject(await readProjectFile(file));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not load project.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark">H</span>
        <div>
          <h1>Hall Product Studio</h1>
          <p className="project-title-line">
            {projectTitle}
            {isDirty ? ' - Unsaved' : ''}
          </p>
        </div>
      </div>

      <div className="top-actions">
        <TemplatePicker
          onApply={(templateId) => {
            if (confirmReset('Create a new scene from this template')) {
              applyProjectTemplate(templateId);
            }
          }}
        />

        <MenuGroup title="Scene">
          <section className="menu-section">
            <h2>Scene Templates</h2>
            <div className="menu-button-grid">
              {Object.entries(sceneTemplates).map(([value, template]) => (
                <button key={value} type="button" onClick={() => applySceneTemplate(value as keyof typeof sceneTemplates)}>
                  {template.label}
                </button>
              ))}
            </div>
          </section>
          <section className="menu-section">
            <h2>Render Presets</h2>
            <div className="menu-button-grid">
              {Object.entries(productRenderPresets).map(([value, preset]) => (
                <button key={value} type="button" onClick={() => applyProductRenderPreset(value as keyof typeof productRenderPresets)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </section>
        </MenuGroup>

        <MenuGroup title="Camera">
          <section className="menu-section">
            <h2>Preset</h2>
            <div className="segmented-grid">
              {cameraPresets.map((preset) => (
                <button key={preset} type="button" className={cameraPreset === preset ? 'active' : ''} onClick={() => setCameraPreset(preset)}>
                  {preset}
                </button>
              ))}
            </div>
          </section>
          <label className="range-control full-width-control">
            <span>Distance</span>
            <input
              type="range"
              min="2"
              max="16"
              step="0.25"
              value={cameraDistance}
              onChange={(event) => setCameraDistance(Number(event.target.value))}
            />
          </label>
          <div className="menu-button-row">
            <button type="button" onClick={() => requestFrame('selected')} disabled={!selectedObject}>
              Frame Selected
            </button>
            <button type="button" onClick={() => requestFrame('all')} disabled={objects.length === 0}>
              Frame All
            </button>
            <button type="button" onClick={resetCamera}>
              Reset Camera
            </button>
          </div>
        </MenuGroup>

        <MenuGroup title="View">
          <section className="menu-section">
            <h2>Background</h2>
            <div className="segmented-grid">
              {backgroundModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={settings.backgroundMode === mode ? 'active' : ''}
                  onClick={() => updateSettings({ backgroundMode: mode })}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>
          <div className="menu-toggle-grid">
            <label className="toggle-control">
              <input type="checkbox" checked={settings.floorVisible} onChange={(event) => updateSettings({ floorVisible: event.target.checked })} />
              Floor
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.gridVisible} onChange={(event) => updateSettings({ gridVisible: event.target.checked })} />
              Grid
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.shadowsEnabled} onChange={(event) => updateSettings({ shadowsEnabled: event.target.checked })} />
              Shadows
            </label>
          </div>
        </MenuGroup>

        <MenuGroup title="Export">
          <label className="field menu-field">
            <span>Size</span>
            <select value={settings.screenshotSize} onChange={(event) => updateSettings({ screenshotSize: event.target.value as ScreenshotSize })}>
              {screenshotSizes.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field menu-field">
            <span>Filename</span>
            <input
              className="filename-input"
              value={exportFileName}
              onChange={(event) => updateExportFileName(event.target.value)}
              aria-label="Export filename"
            />
          </label>
          <button type="button" className="primary-action" onClick={requestExportScreenshot}>
            Export PNG
          </button>
        </MenuGroup>

        <MenuGroup title="Project">
          <div className="menu-button-row">
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                downloadProject(objects, settings, projectTitle, projectNotes);
                markSaved();
              }}
            >
              Save Project
            </button>
            <button type="button" onClick={() => loadInputRef.current?.click()}>
              Load Project
            </button>
            <button
              type="button"
              onClick={() => {
                if (objects.length === 0 || confirmReset('Clear the scene')) {
                  clearScene();
                }
              }}
            >
              Clear Scene
            </button>
          </div>
        </MenuGroup>

        <div className="quick-actions" aria-label="Quick actions">
          <button type="button" className="primary-action" onClick={requestExportScreenshot}>
            Export PNG
          </button>
          <button
            type="button"
            onClick={() => {
              downloadProject(objects, settings, projectTitle, projectNotes);
              markSaved();
            }}
          >
            Save
          </button>
          <button type="button" onClick={() => loadInputRef.current?.click()}>
            Load
          </button>
        </div>
      </div>

      <input ref={loadInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={handleLoadProject} />
    </header>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="menu-group">
      <summary>{title}</summary>
      <div className="menu-panel">{children}</div>
    </details>
  );
}

function TemplatePicker({ onApply }: { onApply: (templateId: ProjectTemplateId) => void }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<ProjectTemplateId>('blank-studio');
  const selectedTemplate = projectTemplates.find((template) => template.id === selectedTemplateId) ?? projectTemplates[0];

  return (
    <details className="template-picker">
      <summary>Templates</summary>
      <div className="template-panel">
        <div className="menu-section">
          <h2>New From Template</h2>
        </div>
        <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value as ProjectTemplateId)}>
          {projectTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <div className="template-meta">
          <strong>{selectedTemplate.name}</strong>
          <span>{selectedTemplate.description}</span>
          <span>Export: {selectedTemplate.recommendedExportSize}</span>
          <span>Background: {selectedTemplate.backgroundMode}</span>
          <span>Use: {selectedTemplate.intendedUse}</span>
        </div>
        <button type="button" onClick={() => onApply(selectedTemplate.id)}>
          Apply Template
        </button>
      </div>
    </details>
  );
}
