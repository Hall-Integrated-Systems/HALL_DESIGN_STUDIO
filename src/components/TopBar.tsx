import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createProject, downloadProject, estimateProjectBytes, formatBytes, readProjectFile } from '../utils/projectSerialization';
import { useStudioStore } from '../state/studioStore';
import type { BackgroundMode, CameraPreset, ProjectSource, ProjectTemplateId, ScreenshotSize, SnapSize } from '../types/studioTypes';
import { APP_VERSION, productRenderPresets, sceneTemplates } from '../config/presets';
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
const snapSizes: SnapSize[] = [0.125, 0.25, 0.5, 1];

const screenshotSizes: Array<{ value: ScreenshotSize; label: string }> = [
  { value: 'viewport', label: 'Viewport' },
  { value: 'square-1200', label: '1200 Square' },
  { value: 'hd-1920', label: '1920 x 1080' },
  { value: 'square-2400', label: '2400 Square' },
];

const BROWSER_PROJECT_WARNING_BYTES = 5 * 1024 * 1024;
const LIVE_SITE_URL = 'https://studio.hallintegratedsystems.com';
const formatScreenshotSize = (value: ScreenshotSize) => screenshotSizes.find((size) => size.value === value)?.label ?? value;
const getSaveStateLabel = (isDirty: boolean, browserProjectId: string | null, projectSource: ProjectSource) => {
  if (isDirty) return 'Unsaved Changes';
  if (browserProjectId) return 'Saved';
  if (projectSource === 'json') return 'Loaded from JSON - Never Saved to Browser';
  return 'Never Saved';
};
export type TopMenuId = 'templates' | 'scene' | 'camera' | 'view' | 'export' | 'project' | 'help';

export function TopBar({
  openMenu,
  setOpenMenu,
}: {
  openMenu: TopMenuId | null;
  setOpenMenu: (menu: TopMenuId | null) => void;
}) {
  const loadInputRef = useRef<HTMLInputElement>(null);
  const menuRefs = useRef<Partial<Record<TopMenuId, HTMLDivElement | null>>>({});
  const objects = useStudioStore((state) => state.objects);
  const projectTitle = useStudioStore((state) => state.projectTitle);
  const projectNotes = useStudioStore((state) => state.projectNotes);
  const isDirty = useStudioStore((state) => state.isDirty);
  const activeBrowserProjectId = useStudioStore((state) => state.activeBrowserProjectId);
  const projectSource = useStudioStore((state) => state.projectSource);
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
  const deleteSelected = useStudioStore((state) => state.deleteSelected);
  const selectObject = useStudioStore((state) => state.selectObject);
  const setCameraPreset = useStudioStore((state) => state.setCameraPreset);
  const setCameraDistance = useStudioStore((state) => state.setCameraDistance);
  const requestFrame = useStudioStore((state) => state.requestFrame);
  const requestExportScreenshot = useStudioStore((state) => state.requestExportScreenshot);
  const isExporting = useStudioStore((state) => state.isExporting);
  const applySceneTemplate = useStudioStore((state) => state.applySceneTemplate);
  const applyProductRenderPreset = useStudioStore((state) => state.applyProductRenderPreset);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const updateExportFileName = useStudioStore((state) => state.updateExportFileName);
  const resetCamera = useStudioStore((state) => state.resetCamera);
  const pushToast = useStudioStore((state) => state.pushToast);
  const exportFileName = settings.exportFileNameEdited ? settings.exportFileName : selectedObject?.name || 'hall-product-studio-render';
  const saveStateLabel = getSaveStateLabel(isDirty, activeBrowserProjectId, projectSource);
  const [browserProjects, setBrowserProjects] = useState<BrowserProjectRecord[]>([]);
  const [customPresets, setCustomPresets] = useState<CustomRenderPreset[]>([]);
  const [storageStatus, setStorageStatus] = useState('');
  const [brandLogoFailed, setBrandLogoFailed] = useState(false);
  const autosaveReadyRef = useRef(false);

  const buildCurrentProject = () => createProject(objects, settings, projectTitle, projectNotes, cameraPreset, cameraDistance);
  const closeTopMenu = () => setOpenMenu(null);
  const handleRequestExport = (event?: { currentTarget?: { blur: () => void } }) => {
    requestExportScreenshot();
    event?.currentTarget?.blur();
  };

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const activeMenu = menuRefs.current[openMenu];
      if (activeMenu && event.target instanceof Node && !activeMenu.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openMenu]);

  const refreshBrowserData = async () => {
    try {
      const [projects, presets] = await Promise.all([listBrowserProjects(), listCustomRenderPresets()]);
      setBrowserProjects(projects);
      setCustomPresets(presets);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Browser storage is not available.';
      setStorageStatus(message);
      pushToast(message, 'error');
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
          pushToast('Autosave draft restored.', 'success');
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
        pushToast('Autosave could not write to browser storage.', 'warning');
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [objects, settings, projectTitle, projectNotes, cameraPreset, cameraDistance, isDirty]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openMenu) {
        event.preventDefault();
        setOpenMenu(null);
        return;
      }

      const hasModifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (hasModifier && key === 's') {
        event.preventDefault();
        handleSaveBrowserProject(false);
        return;
      }

      if (hasModifier && key === 'e') {
        event.preventDefault();
        requestExportScreenshot();
        return;
      }

      if (isEditableTarget(event.target)) return;

      if (event.key === 'Escape') {
        selectObject(null);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedObjectId) {
          event.preventDefault();
          deleteSelected();
          pushToast('Selected object deleted.', 'info');
        }
        return;
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const confirmReset = (actionLabel: string) => {
    if (objects.length === 0 && !isDirty) return true;
    const reason = isDirty ? 'You have unsaved changes.' : 'This scene contains objects.';
    return window.confirm(`${reason} ${actionLabel}?`);
  };

  const handleLoadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isDirty && !window.confirm('You have unsaved changes. Load this JSON project and replace the current scene?')) {
      event.target.value = '';
      return;
    }

    try {
      loadProject(await readProjectFile(file), null, 'json');
      clearAutosaveDraft();
      setStorageStatus(`Loaded ${file.name} from JSON. Never saved to this browser.`);
      pushToast(`Loaded ${file.name}. Never saved to browser storage.`, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Failed JSON load. Choose a compatible Hall Product Studio project file.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const confirmBrowserStorageSize = () => {
    const project = buildCurrentProject();
    const projectBytes = estimateProjectBytes(project);

    if (projectBytes <= BROWSER_PROJECT_WARNING_BYTES) return true;

    const message = `This project is ${formatBytes(projectBytes)} as JSON. Large image planes or embedded models can use browser storage quickly. Export a JSON file as your backup instead of relying only on browser storage.`;
    pushToast(message, 'warning');
    return window.confirm(`${message} Continue saving to this browser?`);
  };

  const handleDownloadProject = () => {
    downloadProject(objects, settings, projectTitle, projectNotes, cameraPreset, cameraDistance);
    pushToast('Project JSON exported. Browser save state unchanged.', 'success');
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
      const action = existing ? 'Updated' : 'Saved';
      setStorageStatus(`${action} "${record.title}" in this browser.`);
      pushToast(`${action} "${record.title}" in this browser.`, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Could not save to browser storage.', 'error');
    }
  };

  const handleOpenBrowserProject = async (record: BrowserProjectRecord) => {
    if (!confirmReset(`Open "${record.title}" from browser storage`)) return;

    loadProject(record.project, record.id, 'browser');
    await clearAutosaveDraft();
    setStorageStatus(`Opened "${record.title}".`);
    pushToast(`Loaded "${record.title}".`, 'success');
    closeTopMenu();
  };

  const handleDeleteBrowserProject = async (record: BrowserProjectRecord) => {
    if (!window.confirm(`Delete "${record.title}" from this browser?`)) return;
    await deleteBrowserProject(record.id);
    if (activeBrowserProjectId === record.id) setActiveBrowserProjectId(null);
    await refreshBrowserData();
    setStorageStatus(`Deleted "${record.title}".`);
    pushToast(`Deleted browser project "${record.title}".`, 'info');
  };

  const handleDuplicateBrowserProject = async (record: BrowserProjectRecord) => {
    const duplicate = await duplicateBrowserProject(record.id);
    await refreshBrowserData();
    if (duplicate) {
      setStorageStatus(`Duplicated "${record.title}".`);
      pushToast(`Duplicated "${record.title}".`, 'success');
    }
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
    pushToast(`Saved render preset "${name}".`, 'success');
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
    pushToast(`Deleted custom preset "${preset.name}".`, 'info');
  };

  return (
    <header className="top-bar">
      <div className="brand-block">
        {brandLogoFailed ? (
          <span className="brand-mark brand-mark-fallback" aria-label="Hall Integrated Systems">H</span>
        ) : (
          <img
            className="brand-mark"
            src="/assets/brand/logo-h-circuit-nohalo.png"
            alt="Hall Integrated Systems"
            onError={() => setBrandLogoFailed(true)}
          />
        )}
        <div>
          <h1>Hall Product Studio</h1>
          <p className="project-title-line">
            {projectTitle}
            {' - '}
            {saveStateLabel}
          </p>
        </div>
      </div>

      <div className="top-actions">
        <TemplatePicker
          menuId="templates"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.templates = node;
          }}
          onApply={(templateId) => {
            if (confirmReset('Create a new scene from this template')) {
              applyProjectTemplate(templateId);
              closeTopMenu();
            }
          }}
        />

        <MenuGroup
          id="scene"
          title="Scene"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.scene = node;
          }}
        >
          <section className="menu-section">
            <h2>Scene Templates</h2>
            <div className="menu-button-grid">
              {Object.entries(sceneTemplates).map(([value, template]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    applySceneTemplate(value as keyof typeof sceneTemplates);
                    closeTopMenu();
                  }}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </section>
          <section className="menu-section">
            <h2>Render Presets</h2>
            <div className="menu-button-grid">
              {Object.entries(productRenderPresets).map(([value, preset]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    applyProductRenderPreset(value as keyof typeof productRenderPresets);
                    closeTopMenu();
                  }}
                >
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

        <MenuGroup
          id="camera"
          title="Camera"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.camera = node;
          }}
        >
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

        <MenuGroup
          id="view"
          title="View"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.view = node;
          }}
        >
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
            <label className="field menu-field menu-wide-field">
              <span>Selection</span>
              <select
                value={settings.selectionMode}
                onChange={(event) =>
                  updateSettings({ selectionMode: event.target.value === 'panel-select-only' ? 'panel-select-only' : 'canvas-select-move' })
                }
              >
                <option value="canvas-select-move">Canvas Select + Move</option>
                <option value="panel-select-only">Panel Select Only</option>
              </select>
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.floorVisible} onChange={(event) => updateSettings({ floorVisible: event.target.checked })} />
              Floor
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.gridVisible} onChange={(event) => updateSettings({ gridVisible: event.target.checked })} />
              Grid
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.snapToGrid} onChange={(event) => updateSettings({ snapToGrid: event.target.checked })} />
              Snap to Grid
            </label>
            <label className="field menu-field">
              <span>Snap Size</span>
              <select value={settings.gridSnapSize} onChange={(event) => updateSettings({ gridSnapSize: Number(event.target.value) as SnapSize })}>
                {snapSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label className="field menu-field">
              <span>Duplicate Offset</span>
              <input
                type="number"
                min={0}
                step={settings.gridSnapSize}
                value={settings.duplicateOffset}
                onChange={(event) => updateSettings({ duplicateOffset: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.shadowsEnabled} onChange={(event) => updateSettings({ shadowsEnabled: event.target.checked })} />
              Shadows
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={settings.moveSelectedOnly} onChange={(event) => updateSettings({ moveSelectedOnly: event.target.checked })} />
              Move Panel-Selected Object Only
            </label>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={settings.ignoreLockedObjectsInCanvasSelection}
                onChange={(event) => updateSettings({ ignoreLockedObjectsInCanvasSelection: event.target.checked })}
              />
              Ignore locked objects in canvas selection
            </label>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={settings.axisHelperVisible}
                onChange={(event) => updateSettings({ axisHelperVisible: event.target.checked })}
              />
              Show Direction Helper
            </label>
          </div>
        </MenuGroup>

        <MenuGroup
          id="export"
          title="Export"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.export = node;
          }}
        >
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
          <button
            type="button"
            className="primary-action"
            disabled={isExporting}
            onClick={(event) => {
              handleRequestExport(event);
              closeTopMenu();
            }}
          >
            {isExporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </MenuGroup>

        <MenuGroup
          id="project"
          title="Project"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.project = node;
          }}
        >
          <div className="menu-button-row">
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                handleSaveBrowserProject(false);
                closeTopMenu();
              }}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveBrowserProject(true);
                closeTopMenu();
              }}
            >
              Save As Browser Project
            </button>
          </div>
          <div className="menu-button-row">
            <button
              type="button"
              onClick={() => {
                handleDownloadProject();
                closeTopMenu();
              }}
            >
              Export JSON Backup
            </button>
            <button
              type="button"
              onClick={() => {
                loadInputRef.current?.click();
                closeTopMenu();
              }}
            >
              Load JSON File
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
                  pushToast('Scene cleared.', 'info');
                  closeTopMenu();
                }
              }}
            >
              Clear Scene
            </button>
          </div>
          {storageStatus ? <p className="menu-note">{storageStatus}</p> : null}
        </MenuGroup>

        <MenuGroup
          id="help"
          title="Help / About"
          className="help-about-menu"
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          setMenuRef={(node) => {
            menuRefs.current.help = node;
          }}
        >
          <section className="menu-section">
            <h2>About</h2>
            <p className="menu-note">
              <strong>Hall Product Studio</strong>
            </p>
            <p className="menu-note">Version: {APP_VERSION}</p>
            <p className="menu-note">
              Live site: <a href={LIVE_SITE_URL}>{LIVE_SITE_URL}</a>
            </p>
          </section>
          <section className="menu-section">
            <h2>Supported Imports</h2>
            <p className="menu-note">Models: GLB and self-contained GLTF. Images: PNG, JPG, JPEG, and WEBP. Projects: JSON project files.</p>
          </section>
          <section className="menu-section">
            <h2>Export Sizes</h2>
            <p className="menu-note">1200 square for tiles, 1920 x 1080 for banners, and 2400 square for high-quality product images.</p>
          </section>
          <section className="menu-section">
            <h2>Storage</h2>
            <p className="menu-note">
              Large image planes and embedded models can make browser projects heavy. Use JSON export as the backup path for important work.
            </p>
          </section>
          <section className="menu-section">
            <h2>Shortcuts</h2>
            <p className="menu-note">Delete removes the selected object. Ctrl/Cmd+S saves to browser. Ctrl/Cmd+E exports PNG. Escape deselects.</p>
          </section>
          <section className="menu-section">
            <h2>Known Limitations</h2>
            <p className="menu-note">
              This is a product staging and mockup tool, not CAD. Multi-file GLTF texture relinking, STL editing, slicing, advanced offline rendering,
              and cloud sync are intentionally out of scope.
            </p>
          </section>
        </MenuGroup>

        <div className="quick-actions" aria-label="Quick actions">
          <button type="button" className="primary-action" onClick={handleRequestExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export PNG'}
          </button>
          <button
            type="button"
            onClick={() => handleSaveBrowserProject(false)}
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

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function MenuGroup({
  id,
  title,
  children,
  className = '',
  openMenu,
  setOpenMenu,
  setMenuRef,
}: {
  id: TopMenuId;
  title: string;
  children: ReactNode;
  className?: string;
  openMenu: TopMenuId | null;
  setOpenMenu: (menu: TopMenuId | null) => void;
  setMenuRef: (node: HTMLDivElement | null) => void;
}) {
  const isOpen = openMenu === id;

  return (
    <div className={`menu-group ${className}`.trim()} ref={setMenuRef}>
      <button type="button" className="menu-trigger" aria-expanded={isOpen} onClick={() => setOpenMenu(isOpen ? null : id)}>
        {title}
      </button>
      {isOpen && (
        <div className="menu-panel">
          <div className="menu-panel-header">
            <strong>{title}</strong>
            <button type="button" className="menu-hide-button" onClick={() => setOpenMenu(null)}>
              Hide
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

function TemplatePicker({
  menuId,
  openMenu,
  setOpenMenu,
  setMenuRef,
  onApply,
}: {
  menuId: TopMenuId;
  openMenu: TopMenuId | null;
  setOpenMenu: (menu: TopMenuId | null) => void;
  setMenuRef: (node: HTMLDivElement | null) => void;
  onApply: (templateId: ProjectTemplateId) => void;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<ProjectTemplateId>('blank-studio');
  const selectedTemplate = projectTemplates.find((template) => template.id === selectedTemplateId) ?? projectTemplates[0];
  const isOpen = openMenu === menuId;

  return (
    <div className="template-picker" ref={setMenuRef}>
      <button type="button" className="menu-trigger" aria-expanded={isOpen} onClick={() => setOpenMenu(isOpen ? null : menuId)}>
        Templates
      </button>
      {isOpen && (
        <div className="template-panel">
          <div className="menu-panel-header">
            <strong>Templates</strong>
            <button type="button" className="menu-hide-button" onClick={() => setOpenMenu(null)}>
              Hide
            </button>
          </div>
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
      )}
    </div>
  );
}
