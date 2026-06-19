import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, PointerEvent } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStudioStore } from '../state/studioStore';
import type { AnnotationKind, CustomAssembly, PrimitiveKind } from '../types/studioTypes';
import { assetCategories, builtInAssets, imageDecalAssets } from '../config/assets';
import { mountingHelpers } from '../config/mountingHelpers';
import { CUSTOM_ASSEMBLIES_CHANGED_EVENT, deleteCustomAssembly, listCustomAssemblies } from '../utils/localProjectStorage';

const primitiveButtons: Array<{ kind: PrimitiveKind; label: string }> = [
  { kind: 'cube', label: 'Cube' },
  { kind: 'cylinder', label: 'Cylinder' },
  { kind: 'sphere', label: 'Sphere' },
  { kind: 'plane', label: 'Plane' },
];

const annotationButtons: Array<{ kind: AnnotationKind; label: string }> = [
  { kind: 'text-label', label: 'Text Label' },
  { kind: 'arrow-callout', label: 'Arrow Callout' },
  { kind: 'dimension-line', label: 'Dimension Line' },
  { kind: 'marker-dot', label: 'Marker / Dot' },
];

const supportedModelTypes = ['glb', 'gltf'];
const supportedImageTypes = ['png', 'jpg', 'jpeg', 'webp'];
const maxImageBytes = 12 * 1024 * 1024;
const maxImagePixels = 24_000_000;
const leftToolbarWidthStorageKey = 'hall-product-studio.leftToolbarWidth';
const defaultLeftToolbarWidth = 230;
const minLeftToolbarWidth = 220;
const maxLeftToolbarWidth = 440;
const maxLeftToolbarViewportRatio = 0.34;

const getMaxLeftToolbarWidth = () => {
  if (typeof window === 'undefined') return maxLeftToolbarWidth;
  return Math.max(minLeftToolbarWidth, Math.min(maxLeftToolbarWidth, Math.floor(window.innerWidth * maxLeftToolbarViewportRatio)));
};

const clampLeftToolbarWidth = (width: number) => Math.min(Math.max(width, minLeftToolbarWidth), getMaxLeftToolbarWidth());

const getStoredLeftToolbarWidth = () => {
  if (typeof window === 'undefined') return defaultLeftToolbarWidth;

  const storedWidth = Number(window.localStorage.getItem(leftToolbarWidthStorageKey));
  return Number.isFinite(storedWidth) ? clampLeftToolbarWidth(storedWidth) : defaultLeftToolbarWidth;
};

const getCustomAssemblyDisplayName = (assembly: Partial<CustomAssembly>) =>
  typeof assembly.name === 'string' && assembly.name.trim() ? assembly.name.trim() : 'Untitled Assembly';

const getCustomAssemblyObjectCount = (assembly: Partial<CustomAssembly>) =>
  Array.isArray(assembly.objects) ? assembly.objects.length : 0;

const getCustomAssemblyDateLabel = (assembly: Partial<CustomAssembly>) => {
  const dateValue = assembly.updatedAt ?? assembly.createdAt;
  const time = typeof dateValue === 'string' ? Date.parse(dateValue) : Number.NaN;

  if (!Number.isFinite(time)) return null;

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(time));
};

const getCustomAssemblyMetaLabel = (assembly: Partial<CustomAssembly>) => {
  const objectCount = getCustomAssemblyObjectCount(assembly);
  const objectLabel = objectCount === 1 ? 'object' : 'objects';
  return `${objectCount} ${objectLabel} - ${getCustomAssemblyDateLabel(assembly) ?? 'date unknown'}`;
};

const getCustomAssemblyTitle = (assembly: Partial<CustomAssembly>) => {
  const assemblyName = getCustomAssemblyDisplayName(assembly);
  const objectCount = getCustomAssemblyObjectCount(assembly);
  const objectLabel = objectCount === 1 ? 'object' : 'objects';
  const dateLabel = getCustomAssemblyDateLabel(assembly);
  return [assemblyName, `${objectCount} ${objectLabel}`, dateLabel ? `Saved ${dateLabel}` : null].filter(Boolean).join('\n');
};

export function LeftToolbar({ className = '' }: { className?: string }) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [customAssemblies, setCustomAssemblies] = useState<CustomAssembly[]>([]);
  const [leftToolbarWidth, setLeftToolbarWidth] = useState(getStoredLeftToolbarWidth);
  const addPrimitive = useStudioStore((state) => state.addPrimitive);
  const addAnnotation = useStudioStore((state) => state.addAnnotation);
  const addMountingHelper = useStudioStore((state) => state.addMountingHelper);
  const addModel = useStudioStore((state) => state.addModel);
  const addImagePlane = useStudioStore((state) => state.addImagePlane);
  const addBuiltInAsset = useStudioStore((state) => state.addBuiltInAsset);
  const addImageDecalAsset = useStudioStore((state) => state.addImageDecalAsset);
  const addImportedAsset = useStudioStore((state) => state.addImportedAsset);
  const addImportedImage = useStudioStore((state) => state.addImportedImage);
  const addCustomAssemblyToScene = useStudioStore((state) => state.addCustomAssemblyToScene);
  const importedAssetHistory = useStudioStore((state) => state.importedAssetHistory);
  const importedImageHistory = useStudioStore((state) => state.importedImageHistory);
  const pushToast = useStudioStore((state) => state.pushToast);

  const refreshCustomAssemblies = async () => {
    try {
      setCustomAssemblies(await listCustomAssemblies());
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Custom assemblies could not be loaded.', 'warning');
    }
  };

  useEffect(() => {
    refreshCustomAssemblies();
    const handleCustomAssembliesChanged = () => {
      refreshCustomAssemblies();
    };
    window.addEventListener(CUSTOM_ASSEMBLIES_CHANGED_EVENT, handleCustomAssembliesChanged);
    return () => window.removeEventListener(CUSTOM_ASSEMBLIES_CHANGED_EVENT, handleCustomAssembliesChanged);
  }, []);

  const handleResizePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = leftToolbarWidth;
    document.body.classList.add('left-toolbar-resizing');

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = clampLeftToolbarWidth(startWidth + moveEvent.clientX - startX);
      setLeftToolbarWidth(nextWidth);
      window.localStorage.setItem(leftToolbarWidthStorageKey, String(nextWidth));
    };

    const handlePointerUp = () => {
      document.body.classList.remove('left-toolbar-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleAddPrimitive = (kind: PrimitiveKind, label: string) => {
    addPrimitive(kind);
    pushToast(`${label} added.`, 'success');
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!hasExtension(file.name, supportedModelTypes)) {
        throw new Error('Unsupported file type. Import a .glb or self-contained .gltf model.');
      }

      const modelDataUrl = await readFileAsDataUrl(file);
      await validateGltf(modelDataUrl);
      addModel(file.name, modelDataUrl);
      pushToast(`Imported ${file.name}.`, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Import failed. Try a different GLB or GLTF file.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleImageImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!hasExtension(file.name, supportedImageTypes)) {
        throw new Error('Unsupported file type. Import a PNG, JPG, JPEG, or WEBP image.');
      }

      if (file.size > maxImageBytes) {
        throw new Error('Image is too large. Use a web-sized PNG, JPG, or WEBP under 12 MB for reliable browser storage and export.');
      }

      const imageDataUrl = await readFileAsDataUrl(file);
      const imageSize = await loadImageSize(imageDataUrl);

      if (imageSize.width * imageSize.height > maxImagePixels) {
        throw new Error('Image dimensions are too large. Use an image under about 24 megapixels for decals and labels.');
      }

      addImagePlane(file.name, imageDataUrl, imageSize.width, imageSize.height);
      pushToast(`Imported ${file.name}.`, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Image import failed. Try a smaller PNG, JPG, or WEBP file.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleAddCustomAssembly = (assembly: CustomAssembly) => {
    const assemblyName = getCustomAssemblyDisplayName(assembly);
    addCustomAssemblyToScene(assembly);
    pushToast(`${assemblyName} added to scene.`, 'success');
  };

  const handleDeleteCustomAssembly = async (assembly: CustomAssembly) => {
    const assemblyName = getCustomAssemblyDisplayName(assembly);
    if (!window.confirm(`Delete custom assembly "${assemblyName}" from this browser? Scene objects already inserted will stay in the scene.`)) return;

    try {
      await deleteCustomAssembly(assembly.id);
      await refreshCustomAssemblies();
      window.dispatchEvent(new Event(CUSTOM_ASSEMBLIES_CHANGED_EVENT));
      pushToast(`Deleted custom assembly "${assemblyName}".`, 'info');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Custom assembly could not be deleted.', 'error');
    }
  };

  return (
    <aside
      className={`left-toolbar ${className}`.trim()}
      style={{ '--left-toolbar-width': `${leftToolbarWidth}px` } as CSSProperties}
      aria-label="Add objects"
    >
      <section className="toolbar-section simple-shapes-section">
        <h2>Simple Shapes</h2>
        <div className="toolbar-group shape-button-grid">
          {primitiveButtons.map((button) => (
            <button key={button.kind} type="button" onClick={() => handleAddPrimitive(button.kind, button.label)}>
              {button.label}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-section asset-library">
        <h2>Asset Library</h2>
        {assetCategories
          .filter((category) => category !== 'Image / Decal')
          .map((category) => {
            const builtIns = builtInAssets.filter((asset) => asset.category === category);
            const imported = category === 'Imported Models' ? importedAssetHistory : [];
            if (builtIns.length === 0 && imported.length === 0) return null;

            return (
              <details key={category} open={category !== 'Imported Models'}>
                <summary>{category}</summary>
                <div className="toolbar-group">
                  {builtIns.map((asset) => (
                    <button key={asset.id} type="button" onClick={() => addBuiltInAsset(asset.id)}>
                      {asset.name}
                    </button>
                  ))}
                  {imported.map((asset) => (
                    <button key={asset.id} type="button" onClick={() => addImportedAsset(asset.id)}>
                      {asset.name}
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
      </section>

      <section className="toolbar-section">
        <h2>Custom Assemblies</h2>
        {customAssemblies.length === 0 ? (
          <p className="list-empty">No custom assemblies saved in this browser.</p>
        ) : (
          <div className="toolbar-group">
            {customAssemblies.map((assembly, index) => {
              const assemblyName = getCustomAssemblyDisplayName(assembly);
              const assemblyTitle = getCustomAssemblyTitle(assembly);
              return (
                <div key={assembly.id || `${assemblyName}-${index}`} className="custom-assembly-row" title={assemblyTitle}>
                  <button type="button" onClick={() => handleAddCustomAssembly(assembly)} title={assemblyTitle}>
                    <span className="swatch" style={{ backgroundColor: assembly.previewColor ?? '#8ba4bd' }} />
                    <span className="custom-assembly-label">
                      <span className="custom-assembly-name">{assemblyName}</span>
                      <span className="custom-assembly-meta">{getCustomAssemblyMetaLabel(assembly)}</span>
                    </span>
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDeleteCustomAssembly(assembly)} aria-label={`Delete ${assemblyName}`}>
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="toolbar-section">
        <h2>Mounting Helpers</h2>
        <div className="toolbar-group">
          {mountingHelpers.map((helper) => (
            <button
              key={helper.kind}
              type="button"
              onClick={() => {
                addMountingHelper(helper.kind);
                pushToast(`${helper.baseName} added.`, 'success');
              }}
            >
              {helper.label}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-section">
        <h2>Image / Decal</h2>
        <button type="button" className="import-button" onClick={() => imageInputRef.current?.click()}>
          Import Image
        </button>
        <div className="toolbar-group">
          {imageDecalAssets.map((asset) => (
            <button key={asset.id} type="button" onClick={() => addImageDecalAsset(asset.id)}>
              {asset.name}
            </button>
          ))}
          {importedImageHistory.map((asset) => (
            <button key={asset.id} type="button" onClick={() => addImportedImage(asset.id)}>
              {asset.name}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-section">
        <h2>Annotations</h2>
        <div className="toolbar-group">
          {annotationButtons.map((button) => (
            <button key={button.kind} type="button" onClick={() => addAnnotation(button.kind)}>
              {button.label}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-section">
        <h2>Import</h2>
        <button type="button" className="import-button" onClick={() => importInputRef.current?.click()}>
          Import GLB/GLTF
        </button>
      </section>

      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        onChange={handleImport}
      />
      <input
        ref={imageInputRef}
        className="visually-hidden"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        onChange={handleImageImport}
      />
      <button
        type="button"
        className="left-toolbar-resize-handle"
        aria-label="Resize left sidebar"
        title="Resize left sidebar"
        onPointerDown={handleResizePointerDown}
      />
    </aside>
  );
}

function hasExtension(fileName: string, extensions: string[]) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? extensions.includes(extension) : false;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read ${file.name}.`));
      }
    };
    reader.readAsDataURL(file);
  });
}

async function validateGltf(modelDataUrl: string) {
  try {
    const response = await fetch(modelDataUrl);
    const buffer = await response.arrayBuffer();
    const loader = new GLTFLoader();

    await new Promise((resolve, reject) => {
      loader.parse(buffer, '', resolve, reject);
    });
  } catch {
    throw new Error('This GLB/GLTF could not be opened. It may be broken, incomplete, or depend on external files.');
  }
}

function loadImageSize(imageDataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    image.onerror = () => reject(new Error('Image import failed. The file may be corrupt or unsupported by this browser.'));
    image.src = imageDataUrl;
  });
}
