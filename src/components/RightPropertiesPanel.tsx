import type { ChangeEvent } from 'react';
import { useStudioStore } from '../state/studioStore';
import type { StudioObject, Vec3 } from '../types/studioTypes';
import { brandColorPresets, materialPresets } from '../config/presets';

type VectorField = 'position' | 'rotation' | 'scale';

const axes = ['X', 'Y', 'Z'] as const;

function toDegrees(radians: number) {
  return Number(((radians * 180) / Math.PI).toFixed(2));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function RightPropertiesPanel() {
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const projectTitle = useStudioStore((state) => state.projectTitle);
  const projectNotes = useStudioStore((state) => state.projectNotes);
  const isDirty = useStudioStore((state) => state.isDirty);
  const objects = useStudioStore((state) => state.objects);
  const selectedObject = useStudioStore((state) => state.objects.find((object) => object.id === selectedObjectId));
  const selectObject = useStudioStore((state) => state.selectObject);
  const updateObject = useStudioStore((state) => state.updateObject);
  const updateObjectTransform = useStudioStore((state) => state.updateObjectTransform);
  const updateObjectMaterial = useStudioStore((state) => state.updateObjectMaterial);
  const updateProjectInfo = useStudioStore((state) => state.updateProjectInfo);
  const deleteSelected = useStudioStore((state) => state.deleteSelected);
  const duplicateSelected = useStudioStore((state) => state.duplicateSelected);

  const projectPanel = (
    <ProjectPanel
      title={projectTitle}
      notes={projectNotes}
      isDirty={isDirty}
      onTitleChange={(value) => updateProjectInfo({ projectTitle: value })}
      onNotesChange={(value) => updateProjectInfo({ projectNotes: value })}
    />
  );

  if (!selectedObject) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        {projectPanel}
        <ObjectList objects={objects} selectedObjectId={selectedObjectId} onSelect={selectObject} />
        <p className="empty-state">
          Select an object in the canvas or scene list to adjust placement, material, lock state, visibility, and export-ready product staging.
        </p>
      </aside>
    );
  }

  const setVectorValue = (field: VectorField, axisIndex: number, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;

    const next = [...selectedObject[field]] as Vec3;
    next[axisIndex] = field === 'rotation' ? toRadians(value) : value;
    updateObjectTransform(selectedObject.id, { [field]: next });
  };

  return (
    <aside className="properties-panel">
      <h2>Properties</h2>
      {projectPanel}
      <ObjectList objects={objects} selectedObjectId={selectedObjectId} onSelect={selectObject} />

      <label className="field">
        <span>Name</span>
        <input value={selectedObject.name} onChange={(event) => updateObject(selectedObject.id, { name: event.target.value })} />
      </label>

      <section className="panel-section">
        <h3>Object State</h3>
        <label className="switch-field">
          <input
            type="checkbox"
            checked={selectedObject.locked}
            onChange={(event) => updateObject(selectedObject.id, { locked: event.target.checked })}
          />
          Locked
        </label>
        <label className="switch-field">
          <input
            type="checkbox"
            checked={selectedObject.visible}
            onChange={(event) => updateObject(selectedObject.id, { visible: event.target.checked })}
          />
          Visible
        </label>
      </section>

      <VectorEditor object={selectedObject} field="position" label="Position" onChange={setVectorValue} />
      <VectorEditor object={selectedObject} field="rotation" label="Rotation" onChange={setVectorValue} />
      <VectorEditor object={selectedObject} field="scale" label="Scale" onChange={setVectorValue} />

      {selectedObject.kind === 'image' && selectedObject.imagePlane ? (
        <ImagePlanePanel object={selectedObject} onUpdate={updateObject} />
      ) : (
        <MaterialPanel object={selectedObject} onUpdateMaterial={updateObjectMaterial} />
      )}

      <div className="object-actions">
        <button type="button" onClick={duplicateSelected}>
          Duplicate
        </button>
        <button type="button" className="danger-button" onClick={deleteSelected}>
          Delete
        </button>
      </div>
    </aside>
  );
}

function ImagePlanePanel({ object, onUpdate }: { object: StudioObject; onUpdate: (id: string, patch: Partial<StudioObject>) => void }) {
  const imagePlane = object.imagePlane;
  if (!imagePlane) return null;

  const updateImagePlane = (patch: Partial<typeof imagePlane>) => {
    onUpdate(object.id, { imagePlane: { ...imagePlane, ...patch } });
  };

  const setPreserveAspectRatio = (preserveAspectRatio: boolean) => {
    const aspect = imagePlane.width > 0 && imagePlane.height > 0 ? imagePlane.width / imagePlane.height : 1;
    onUpdate(object.id, {
      imagePlane: { ...imagePlane, preserveAspectRatio },
      scale: preserveAspectRatio ? [aspect * object.scale[1], object.scale[1], object.scale[2]] : object.scale,
    });
  };

  return (
    <section className="panel-section">
      <h3>Image Plane</h3>
      <p className="list-empty">{imagePlane.fileName || (imagePlane.placeholder ? 'Built-in decal placeholder' : 'Image plane')}</p>
      <RangeField label="Opacity" value={imagePlane.opacity} onChange={(event) => updateImagePlane({ opacity: Number(event.target.value) })} />
      <label className="switch-field">
        <input type="checkbox" checked={imagePlane.doubleSided} onChange={(event) => updateImagePlane({ doubleSided: event.target.checked })} />
        Double-sided
      </label>
      <label className="switch-field">
        <input
          type="checkbox"
          checked={imagePlane.preserveAspectRatio}
          onChange={(event) => setPreserveAspectRatio(event.target.checked)}
        />
        Preserve aspect ratio
      </label>
      <label className="field color-field">
        <span>Tint</span>
        <input type="color" value={imagePlane.tintColor} onChange={(event) => updateImagePlane({ tintColor: event.target.value })} />
      </label>
    </section>
  );
}

function MaterialPanel({
  object,
  onUpdateMaterial,
}: {
  object: StudioObject;
  onUpdateMaterial: (id: string, material: Partial<StudioObject['material']>) => void;
}) {
  return (
    <section className="panel-section">
      <h3>Material</h3>
      <div className="preset-grid color-preset-grid">
        {brandColorPresets.map((preset) => (
          <button key={preset.id} type="button" title={preset.color} onClick={() => onUpdateMaterial(object.id, { color: preset.color })}>
            <span className="swatch" style={{ backgroundColor: preset.color }} />
            {preset.label}
          </button>
        ))}
      </div>
      <div className="preset-grid">
        {materialPresets.map((preset) => (
          <button key={preset.id} type="button" onClick={() => onUpdateMaterial(object.id, preset.material)}>
            {preset.label}
          </button>
        ))}
      </div>
      <label className="field color-field">
        <span>Color</span>
        <input type="color" value={object.material.color} onChange={(event) => onUpdateMaterial(object.id, { color: event.target.value })} />
      </label>
      <RangeField
        label="Roughness"
        value={object.material.roughness}
        onChange={(event) => onUpdateMaterial(object.id, { roughness: Number(event.target.value) })}
      />
      <RangeField
        label="Metalness"
        value={object.material.metalness}
        onChange={(event) => onUpdateMaterial(object.id, { metalness: Number(event.target.value) })}
      />
      <RangeField
        label="Opacity"
        value={object.material.opacity}
        onChange={(event) => onUpdateMaterial(object.id, { opacity: Number(event.target.value) })}
      />
    </section>
  );
}

function ProjectPanel({
  title,
  notes,
  isDirty,
  onTitleChange,
  onNotesChange,
}: {
  title: string;
  notes: string;
  isDirty: boolean;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <section className="panel-section">
      <h3>
        Project
        {isDirty ? <span className="unsaved-badge">Unsaved</span> : null}
      </h3>
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} />
      </label>
    </section>
  );
}

function ObjectList({
  objects,
  selectedObjectId,
  onSelect,
}: {
  objects: StudioObject[];
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section className="panel-section">
      <h3>Scene Objects</h3>
      {objects.length === 0 ? (
        <p className="list-empty">Add a primitive or import a GLB/GLTF model to start staging.</p>
      ) : (
        <div className="object-list">
          {objects.map((object) => (
            <button
              key={object.id}
              type="button"
              className={object.id === selectedObjectId ? 'active' : ''}
              onClick={() => onSelect(object.id)}
            >
              <span>{object.name}</span>
              <small>
                {getObjectTypeLabel(object)} / {object.visible ? 'Visible' : 'Hidden'}
                {object.locked ? ' / Locked' : ''}
              </small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function getObjectTypeLabel(object: StudioObject) {
  if (object.assetCategory) return object.assetCategory;
  if (object.kind === 'model') return 'Imported Model';
  if (object.kind === 'asset') return 'Asset';
  return 'Primitive';
}

function VectorEditor({
  object,
  field,
  label,
  onChange,
}: {
  object: StudioObject;
  field: VectorField;
  label: string;
  onChange: (field: VectorField, axisIndex: number, rawValue: string) => void;
}) {
  return (
    <section className="panel-section">
      <h3>{label}</h3>
      <div className="vector-grid">
        {axes.map((axis, index) => {
          const value = field === 'rotation' ? toDegrees(object[field][index]) : Number(object[field][index].toFixed(3));
          return (
            <label key={axis} className="field compact-field">
              <span>{axis}</span>
              <input type="number" step={field === 'rotation' ? 1 : 0.1} value={value} onChange={(event) => onChange(field, index, event.target.value)} />
            </label>
          );
        })}
      </div>
    </section>
  );
}

function RangeField({ label, value, onChange }: { label: string; value: number; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="field range-field">
      <span>{label}</span>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={onChange} />
      <output>{value.toFixed(2)}</output>
    </label>
  );
}
