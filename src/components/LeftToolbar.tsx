import { ChangeEvent, useRef } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useStudioStore } from '../state/studioStore';
import type { AnnotationKind, PrimitiveKind } from '../types/studioTypes';
import { assetCategories, builtInAssets, imageDecalAssets } from '../config/assets';
import { mountingHelpers } from '../config/mountingHelpers';

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

export function LeftToolbar() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const addPrimitive = useStudioStore((state) => state.addPrimitive);
  const addAnnotation = useStudioStore((state) => state.addAnnotation);
  const addMountingHelper = useStudioStore((state) => state.addMountingHelper);
  const addModel = useStudioStore((state) => state.addModel);
  const addImagePlane = useStudioStore((state) => state.addImagePlane);
  const addBuiltInAsset = useStudioStore((state) => state.addBuiltInAsset);
  const addImageDecalAsset = useStudioStore((state) => state.addImageDecalAsset);
  const addImportedAsset = useStudioStore((state) => state.addImportedAsset);
  const addImportedImage = useStudioStore((state) => state.addImportedImage);
  const importedAssetHistory = useStudioStore((state) => state.importedAssetHistory);
  const importedImageHistory = useStudioStore((state) => state.importedImageHistory);
  const pushToast = useStudioStore((state) => state.pushToast);

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

  return (
    <aside className="left-toolbar" aria-label="Add objects">
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
