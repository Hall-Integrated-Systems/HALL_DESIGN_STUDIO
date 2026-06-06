import { ChangeEvent, useRef } from 'react';
import { useStudioStore } from '../state/studioStore';
import type { PrimitiveKind } from '../types/studioTypes';
import { assetCategories, builtInAssets, imageDecalAssets } from '../config/assets';

const primitiveButtons: Array<{ kind: PrimitiveKind; label: string }> = [
  { kind: 'cube', label: 'Cube' },
  { kind: 'cylinder', label: 'Cylinder' },
  { kind: 'sphere', label: 'Sphere' },
  { kind: 'plane', label: 'Plane' },
];

export function LeftToolbar() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const addPrimitive = useStudioStore((state) => state.addPrimitive);
  const addModel = useStudioStore((state) => state.addModel);
  const addImagePlane = useStudioStore((state) => state.addImagePlane);
  const addBuiltInAsset = useStudioStore((state) => state.addBuiltInAsset);
  const addImageDecalAsset = useStudioStore((state) => state.addImageDecalAsset);
  const addImportedAsset = useStudioStore((state) => state.addImportedAsset);
  const addImportedImage = useStudioStore((state) => state.addImportedImage);
  const importedAssetHistory = useStudioStore((state) => state.importedAssetHistory);
  const importedImageHistory = useStudioStore((state) => state.importedImageHistory);

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        addModel(file.name, reader.result);
      }
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleImageImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return;

      const image = new Image();
      image.addEventListener('load', () => {
        addImagePlane(file.name, reader.result as string, image.naturalWidth || 1, image.naturalHeight || 1);
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <aside className="left-toolbar" aria-label="Add objects">
      <section className="toolbar-section">
        <h2>Primitives</h2>
      <div className="toolbar-group">
        {primitiveButtons.map((button) => (
          <button key={button.kind} type="button" onClick={() => addPrimitive(button.kind)}>
            {button.label}
          </button>
        ))}
      </div>
      </section>

      <button type="button" className="import-button" onClick={() => importInputRef.current?.click()}>
        Import GLB/GLTF
      </button>
      <button type="button" className="import-button" onClick={() => imageInputRef.current?.click()}>
        Import Image
      </button>

      <section className="toolbar-section asset-library">
        <h2>Asset Library</h2>
        {assetCategories.map((category) => {
          const builtIns = builtInAssets.filter((asset) => asset.category === category);
          const imported = category === 'Imported Models' ? importedAssetHistory : [];
          const imageDecals = category === 'Image / Decal' ? imageDecalAssets : [];
          const importedImages = category === 'Image / Decal' ? importedImageHistory : [];
          if (builtIns.length === 0 && imported.length === 0 && imageDecals.length === 0 && importedImages.length === 0) return null;

          return (
            <details key={category} open={category !== 'Imported Models'}>
              <summary>{category}</summary>
              <div className="toolbar-group">
                {builtIns.map((asset) => (
                  <button key={asset.id} type="button" onClick={() => addBuiltInAsset(asset.id)}>
                    {asset.name}
                  </button>
                ))}
                {imageDecals.map((asset) => (
                  <button key={asset.id} type="button" onClick={() => addImageDecalAsset(asset.id)}>
                    {asset.name}
                  </button>
                ))}
                {importedImages.map((asset) => (
                  <button key={asset.id} type="button" onClick={() => addImportedImage(asset.id)}>
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
