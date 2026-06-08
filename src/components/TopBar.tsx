import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createProject, downloadProject, estimateProjectBytes, formatBytes, readProjectFile } from '../utils/projectSerialization';
import { useStudioStore } from '../state/studioStore';
import type { BackgroundMode, CameraPreset, ProjectTemplateId, ScreenshotSize } from '../types/studioTypes';
import { productRenderPresets, sceneTemplates } from '../config/presets';
import { projectTemplates } from '../config/projectTemplates';
import {
  clearAutosaveDraft,
  createBrowserProjectRecord,
  deleteBrowserProject,
  deleteCustomRenderPreset,
  duplicateBrowserProject,
  getAutosaveDraft,
  getAutosaveDraftFlag,
  getBrowserProject,
  listBrowserProjects,
  listCustomRenderPresets,
  saveAutosaveDraft,
  saveBrowserProject,
  saveCustomRenderPreset,
  type BrowserProjectRecord,
  type CustomRenderPreset,
} from '../utils/localProjectStorage';

const cameraPresets: CameraPreset[] = ['front', 'back', 'left', 'right', 'top', 'isometric'];
const backgroundModes: BackgroundMode[] = ['dark', 'light', 'transparent'];

const screenshotSizes: Array<{ value: ScreenshotSize; label: string }> = [
  { value: 'viewport', label: 'Viewport' },
  { value: 'square-1200', label: '1200 Square' },
  { value: 'hd-1920', label: '1920 x 1080' },
  { value: 'square-2400', label: '2400 Square' },
];

const BROWSER_PROJECT_WARNING_BYTES = 5 * 1024 * 1024;
const formatScreenshotSize = (value: ScreenshotSize) => screenshotSizes.find((size) => size.value === value)?.label ?? value;

export function TopBar() {
  const loadInputRef = useRef<HTMLInputElement>(null);
  const objects = useStudioStore((state) => state.objects);
  const projectTitle = useStudioStore((state) => state.projectTitle);
  const projectNotes = useStudioStore((state) => state.projectNotes);
  const isDirty = useStudioStore((state) => state.isDirty);
  const activeBrowserProjectId = useStudioStore((state) => state.activeBrowserProjectId);
  const settings = useStudioStore((state) => state.settings);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedObject = useStudioStore((state) => state.objects.find((object) => object.id === selectedObjectId));
  const cameraPreset = useStudioStore((state) => state.cameraPreset);
  const cameraDistance = useStudioStore((state) => state.cameraDistance);
  const loadProject = useStudioStore((state) => state.loadProject);
  const applyProjectTemplate = useStudioStore((state) => state.applyProjectTemplate);
  const clearScene = useStudioStore((state) => state.clearScene);
  const markSaved = useStudioStore((state) => state.markSaved);
  const setActiveBrowserProjectId = useStudioStore((state) => state.setActiveBrowserProjectId);
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
  const [browserProjects, setBrowserProjects] = useState<BrowserProjectRecord[]>([]);
  const [customPresets, setCustomPresets] = useState<CustomRenderPreset[]>([]);
  const [storageStatus, setStorageStatus] = useState('');
  const autosaveReadyRef = useRef(false);

  const buildCurrentProject = () => createProject(objects, settings, projectTitle, projectNotes, cameraPreset, cameraDistance);

  const refreshBrowserData = async () => {
    try {
      const [projects, presets] = await Promise.all([listBrowserProjects(), listCustomRenderPresets()]);
      setBrowserProjects(projects);
      setCustomPresets(presets);
    } catch (error) {
      setStorageStatus(error instanceof Error ? error.message : 'Browser storage is not available.');
    }
  };

  useEffect(() => {
    refreshBrowserData();

    const autosaveFlag = getAutosaveDraftFlag();
    if (!autosaveFlag) {
      autosaveReadyRef.current = true;
      return;
    }

    getAutosaveDraft()
      .then((draft) => {
        autosaveReadyRef.current = true;
        if (!draft) return;

        const restoredAt = new Date(draft.savedAt).toLocaleString();
        if (window.confirm(`A browser autosave draft from ${restoredAt} is available. Restore it?`)) {
          loadProject(draft.project, null);
          setStorageStatus('Autosave draft restored.');
        } else {
          clearAutosaveDraft();
        }
      })
      .catch(() => {
        autosaveReadyRef.current = true;
      });
  }, [loadProject]);

  useEffect(() => {
    if (!autosaveReadyRef.current || !isDirty) return;

    const timer = window.setTimeout(() => {
      saveAutosaveDraft(buildCurrentProject()).catch(() => {
        setStorageStatus('Autosave could not write to browser storage.');
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [objects, settings, projectTitle, projectNotes, cameraPreset, cameraDistance, isDirty]);

  const confirmReset = (actionLabel: string) => {
    if (objects.length === 0 && !isDirty) return true;
    const reason = isDirty ? 'You have unsaved changes.' : 'This scene contains objects.';
    return window.confirm(`${reason} ${actionLabel}?`);
  };

  const handleLoadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      loadProject(await readProjectFile(file), null);
      setActiveBrowserProjectId(null);
      clearAutosaveDraft();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not load project.');
    } finally {
      event.target.value = '';
    }
  };

  const confirmBrowserStorageSize = () => {
    const project = buildCurrentProject();
    const projectBytes = estimateProjectBytes(project);

    if (projectBytes <= BROWSER_PROJECT_WARNING_BYTES) return true;

    return window.confirm(
      `This project is ${formatBytes(projectBytes)} as JSON. Large image planes or embedded models can use browser storage quickly. Export a JSON file as your backup instead of relying only on browser storage. Continue saving to this browser?`,
    );
  };

  const handleDownloadProject = () => {
    downloadProject(objects, settings, projectTitle, projectNotes, cameraPreset, cameraDistance);
    markSaved();
    clearAutosaveDraft();
  };

  const handleSaveBrowserProject = async (saveAs = false) => {
    if (!confirmBrowserStorageSize()) return;

    try {
      const project = buildCurrentProject();
      const existingId = saveAs ? null : activeBrowserProjectId;
      const existing = existingId ? await getBrowserProject(existingId) : undefined;
      const title =
        saveAs || !existing
          ? window.prompt('Browser project name', projectTitle.trim() || 'Untitled Product Render')?.trim()
          : existing.title;

      if (!title) return;

      const record = createBrowserProjectRecord({ ...project, title }, existing?.id);
      await saveBrowserProject(record);
      setActiveBrowserProjectId(record.id);
      markSaved();
      await clearAutosaveDraft();
      await refreshBrowserData();
      setStorageStatus(`Saved "${record.title}" to this browser.`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not save to browser storage.');
    }
  };

  const handleOpenBrowserProject = async (record: BrowserProjectRecord) => {
    if (!confirmReset(`Open "${record.title}" from browser storage`)) return;

    loadProject(record.project, record.id);
    await clearAutosaveDraft();
    setStorageStatus(`Opened "${record.title}".`);
  };

  const handleDeleteBrowserProject = async (record: BrowserProjectRecord) => {
    if (!window.confirm(`Delete "${record.title}" from this browser?`)) return;
    await deleteBrowserProject(record.id);
    if (activeBrowserProjectId === record.id) setActiveBrowserProjectId(null);
    await refreshBrowserData();
    setStorageStatus(`Deleted "${record.title}".`);
  };

  const handleDuplicateBrowserProject = async (record: BrowserProjectRecord) => {
    const duplicate = await duplicateBrowserProject(record.id);
    await refreshBrowserData();
    if (duplicate) setStorageStatus(`Duplicated "${record.title}".`);
  };

  const handleSaveCustomRenderPreset = async () => {
    const name = window.prompt('Custom render preset name', `${projectTitle} Setup`)?.trim();
    if (!name) return;

    await saveCustomRenderPreset({
      name,
      backgroundMode: settings.backgroundMode,
      floorVisible: settings.floorVisible,
      gridVisible: settings.gridVisible,
      shadowsEnabled: settings.shadowsEnabled,
      screenshotSize: settings.screenshotSize,
      cameraPreset,
      cameraDistance,
    });
    await refreshBrowserData();
    setStorageStatus(`Saved render preset "${name}".`);
  };

  const handleApplyCustomRenderPreset = (preset: CustomRenderPreset) => {
    updateSettings({
      backgroundMode: preset.backgroundMode,
      floorVisible: preset.floorVisible,
      gridVisible: preset.gridVisible,
      shadowsEnabled: preset.shadowsEnabled,
      screenshotSize: preset.screenshotSize,
    });
    setCameraPreset(preset.cameraPreset);
    setCameraDistance(preset.cameraDistance);
  };

  const handleDeleteCustomRenderPreset = async (preset: CustomRenderPreset) => {
    if (!window.confirm(`Delete custom preset "${preset.name}"?`)) return;
    await deleteCustomRenderPreset(preset.id);
    await refreshBrowserData();
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
          <section className="menu-section">
            <h2>Custom Render Presets</h2>
            <button type="button" onClick={handleSaveCustomRenderPreset}>
              Save Current Setup
            </button>
            <div className="saved-item-list">
              {customPresets.length === 0 ? (
                <p className="menu-note">No custom render presets saved in this browser.</p>
              ) : (
                customPresets.map((preset) => (
                  <div className="saved-item" key={preset.id}>
                    <div>
                      <strong>{preset.name}</strong>
                      <span>
                        {formatScreenshotSize(preset.screenshotSize)} / {preset.backgroundMode}
                      </span>
                    </div>
                    <div className="saved-item-actions">
                      <button type="button" onClick={() => handleApplyCustomRenderPreset(preset)}>
                        Apply
                      </button>
                      <button type="button" className="danger-button" onClick={() => handleDeleteCustomRenderPreset(preset)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
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
              onClick={handleDownloadProject}
            >
              Save JSON File
            </button>
            <button type="button" onClick={() => loadInputRef.current?.click()}>
              Load JSON File
            </button>
          </div>
          <div className="menu-button-row">
            <button type="button" className="primary-action" onClick={() => handleSaveBrowserProject(false)}>
              Save to Browser
            </button>
            <button type="button" onClick={() => handleSaveBrowserProject(true)}>
              Save As Browser Project
            </button>
          </div>
          <section className="menu-section">
            <h2>Recent Projects</h2>
            <div className="saved-item-list">
              {browserProjects.length === 0 ? (
                <p className="menu-note">No browser-saved projects yet.</p>
              ) : (
                browserProjects.map((record) => (
                  <div className="saved-item browser-project-item" key={record.id}>
                    <div>
                      <strong>
                        {record.title}
                        {activeBrowserProjectId === record.id ? ' (Open)' : ''}
                      </strong>
                      <span>{new Date(record.savedAt).toLocaleString()}</span>
                      <span>
                        {record.appVersion || 'Unknown version'} / {record.objectCount} object{record.objectCount === 1 ? '' : 's'}
                      </span>
                      {record.notesPreview ? <span>{record.notesPreview}</span> : null}
                    </div>
                    <div className="saved-item-actions">
                      <button type="button" onClick={() => handleOpenBrowserProject(record)}>
                        Open
                      </button>
                      <button type="button" onClick={() => handleDuplicateBrowserProject(record)}>
                        Duplicate
                      </button>
                      <button type="button" className="danger-button" onClick={() => handleDeleteBrowserProject(record)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <div className="menu-button-row">
            <button type="button" onClick={refreshBrowserData}>
              Open Browser Project
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
          {storageStatus ? <p className="menu-note">{storageStatus}</p> : null}
        </MenuGroup>

        <div className="quick-actions" aria-label="Quick actions">
          <button type="button" className="primary-action" onClick={requestExportScreenshot}>
            Export PNG
          </button>
          <button
            type="button"
            onClick={handleDownloadProject}
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
