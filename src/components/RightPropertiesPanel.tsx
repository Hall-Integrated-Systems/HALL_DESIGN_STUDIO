import type { ChangeEvent } from 'react';
import { useStudioStore } from '../state/studioStore';
import type { AlignmentAction, ProjectSource, SelectionMode, StudioObject, Vec3 } from '../types/studioTypes';
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
  const activeBrowserProjectId = useStudioStore((state) => state.activeBrowserProjectId);
  const projectSource = useStudioStore((state) => state.projectSource);
  const objects = useStudioStore((state) => state.objects);
  const settings = useStudioStore((state) => state.settings);
  const selectedObject = useStudioStore((state) => state.objects.find((object) => object.id === selectedObjectId));
  const referenceObjectId = useStudioStore((state) => state.referenceObjectId);
  const selectObject = useStudioStore((state) => state.selectObject);
  const setReferenceObject = useStudioStore((state) => state.setReferenceObject);
  const alignSelectedObject = useStudioStore((state) => state.alignSelectedObject);
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
      saveStateLabel={getSaveStateLabel(isDirty, activeBrowserProjectId, projectSource)}
      onTitleChange={(value) => updateProjectInfo({ projectTitle: value })}
      onNotesChange={(value) => updateProjectInfo({ projectNotes: value })}
    />
  );

  if (!selectedObject) {
    return (
      <aside className="properties-panel">
        <h2>Properties</h2>
        {projectPanel}
        <ObjectList
          objects={objects}
          selectedObjectId={selectedObjectId}
          onSelect={selectObject}
          selectionMode={settings.selectionMode}
          moveSelectedOnly={settings.moveSelectedOnly}
        />
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
      <ObjectList
        objects={objects}
        selectedObjectId={selectedObjectId}
        onSelect={selectObject}
        selectionMode={settings.selectionMode}
        moveSelectedOnly={settings.moveSelectedOnly}
      />

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
      <AlignmentPanel
        objects={objects}
        selectedObjectId={selectedObject.id}
        referenceObjectId={referenceObjectId}
        onReferenceChange={setReferenceObject}
        onAlign={alignSelectedObject}
      />

      {selectedObject.kind === 'image' && selectedObject.imagePlane ? (
        <ImagePlanePanel object={selectedObject} onUpdate={updateObject} />
      ) : selectedObject.kind === 'annotation' && selectedObject.annotation ? (
        <AnnotationPanel object={selectedObject} onUpdate={updateObject} />
      ) : selectedObject.kind === 'mounting-helper' && selectedObject.mountingHelper ? (
        <MountingHelperPanel object={selectedObject} onUpdate={updateObject} onUpdateMaterial={updateObjectMaterial} />
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

function MountingHelperPanel({
  object,
  onUpdate,
  onUpdateMaterial,
}: {
  object: StudioObject;
  onUpdate: (id: string, patch: Partial<StudioObject>) => void;
  onUpdateMaterial: (id: string, material: Partial<StudioObject['material']>) => void;
}) {
  const helper = object.mountingHelper;
  if (!helper) return null;

  const updateHelper = (patch: Partial<typeof helper>) => {
    onUpdate(object.id, { mountingHelper: { ...helper, ...patch } });
  };

  const setClearanceValue = (axisIndex: number, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const next = [...helper.clearanceSize] as Vec3;
    next[axisIndex] = value;
    updateHelper({ clearanceSize: next });
  };

  return (
    <section className="panel-section">
      <h3>Mounting Helper</h3>
      <p className="list-empty">Visual planning marker only. This does not cut or modify geometry.</p>
      <label className="field color-field">
        <span>Color</span>
        <input type="color" value={object.material.color} onChange={(event) => onUpdateMaterial(object.id, { color: event.target.value })} />
      </label>
      <RangeField
        label="Opacity"
        value={object.material.opacity}
        onChange={(event) => onUpdateMaterial(object.id, { opacity: Number(event.target.value) })}
      />

      {helper.kind !== 'centerline' && helper.kind !== 'clearance-zone' && (
        <RangeField label="Diameter" value={helper.diameter} min={0.05} max={2} step={0.01} onChange={(event) => updateHelper({ diameter: Number(event.target.value) })} />
      )}

      {(helper.kind === 'slotted-hole' || helper.kind === 'centerline') && (
        <>
          <RangeField
            label={helper.kind === 'centerline' ? 'Line Length' : 'Slot Length'}
            value={helper.slotLength}
            min={0.1}
            max={4}
            step={0.01}
            onChange={(event) => updateHelper({ slotLength: Number(event.target.value) })}
          />
          <RangeField
            label={helper.kind === 'centerline' ? 'Line Width' : 'Slot Width'}
            value={helper.slotWidth}
            min={0.01}
            max={1}
            step={0.01}
            onChange={(event) => updateHelper({ slotWidth: Number(event.target.value) })}
          />
        </>
      )}

      {helper.kind === 'standoff' && (
        <RangeField
          label="Height"
          value={helper.standoffHeight}
          min={0.05}
          max={3}
          step={0.01}
          onChange={(event) => updateHelper({ standoffHeight: Number(event.target.value) })}
        />
      )}

      {helper.kind === 'clearance-zone' && (
        <section className="panel-section nested-section">
          <h3>Clearance Size</h3>
          <div className="vector-grid">
            {axes.map((axis, index) => (
              <label key={axis} className="field compact-field">
                <span>{axis}</span>
                <input type="number" min={0.01} step={0.1} value={Number(helper.clearanceSize[index].toFixed(3))} onChange={(event) => setClearanceValue(index, event.target.value)} />
              </label>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function AnnotationPanel({ object, onUpdate }: { object: StudioObject; onUpdate: (id: string, patch: Partial<StudioObject>) => void }) {
  const annotation = object.annotation;
  if (!annotation) return null;

  const updateAnnotation = (patch: Partial<typeof annotation>) => {
    onUpdate(object.id, { annotation: { ...annotation, ...patch } });
  };

  const setPointValue = (field: 'start' | 'end', axisIndex: number, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const next = [...annotation[field]] as Vec3;
    next[axisIndex] = value;
    updateAnnotation({ [field]: next });
  };

  return (
    <section className="panel-section">
      <h3>Annotation</h3>
      {annotation.kind !== 'marker-dot' && (
        <label className="field">
          <span>{annotation.kind === 'dimension-line' ? 'Label Text' : 'Text'}</span>
          <input value={annotation.text} onChange={(event) => updateAnnotation({ text: event.target.value })} />
        </label>
      )}
      <label className="field color-field">
        <span>Color</span>
        <input type="color" value={annotation.color} onChange={(event) => updateAnnotation({ color: event.target.value })} />
      </label>
      <RangeField
        label={annotation.kind === 'marker-dot' ? 'Dot Size' : 'Font Size'}
        value={annotation.fontSize}
        min={0.05}
        max={0.5}
        step={0.01}
        onChange={(event) => updateAnnotation({ fontSize: Number(event.target.value) })}
      />

      {(annotation.kind === 'text-label' || annotation.kind === 'arrow-callout') && (
        <>
          <label className="switch-field">
            <input
              type="checkbox"
              checked={annotation.backgroundEnabled}
              onChange={(event) => updateAnnotation({ backgroundEnabled: event.target.checked })}
            />
            Background
          </label>
          <label className="switch-field">
            <input type="checkbox" checked={annotation.faceCamera} onChange={(event) => updateAnnotation({ faceCamera: event.target.checked })} />
            Face camera
          </label>
        </>
      )}

      {annotation.kind === 'dimension-line' && (
        <>
          <AnnotationPointEditor label="Start" point={annotation.start} onChange={(axis, value) => setPointValue('start', axis, value)} />
          <AnnotationPointEditor label="End" point={annotation.end} onChange={(axis, value) => setPointValue('end', axis, value)} />
          <label className="switch-field">
            <input type="checkbox" checked={annotation.autoLength} onChange={(event) => updateAnnotation({ autoLength: event.target.checked })} />
            Auto-length label
          </label>
          <RangeField
            label="Thickness"
            value={annotation.lineThickness}
            min={0.005}
            max={0.08}
            step={0.005}
            onChange={(event) => updateAnnotation({ lineThickness: Number(event.target.value) })}
          />
        </>
      )}

      {annotation.kind === 'arrow-callout' && (
        <>
          <RangeField
            label="Length"
            value={annotation.arrowLength}
            min={0.2}
            max={3}
            step={0.05}
            onChange={(event) => updateAnnotation({ arrowLength: Number(event.target.value) })}
          />
          <label className="field">
            <span>Direction</span>
            <input type="number" step={5} value={annotation.arrowAngle} onChange={(event) => updateAnnotation({ arrowAngle: Number(event.target.value) })} />
          </label>
          <RangeField
            label="Thickness"
            value={annotation.lineThickness}
            min={0.005}
            max={0.08}
            step={0.005}
            onChange={(event) => updateAnnotation({ lineThickness: Number(event.target.value) })}
          />
        </>
      )}
    </section>
  );
}

function AnnotationPointEditor({
  label,
  point,
  onChange,
}: {
  label: string;
  point: Vec3;
  onChange: (axisIndex: number, rawValue: string) => void;
}) {
  return (
    <section className="panel-section nested-section">
      <h3>{label}</h3>
      <div className="vector-grid">
        {axes.map((axis, index) => (
          <label key={axis} className="field compact-field">
            <span>{axis}</span>
            <input type="number" step={0.1} value={Number(point[index].toFixed(3))} onChange={(event) => onChange(index, event.target.value)} />
          </label>
        ))}
      </div>
    </section>
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
  saveStateLabel,
  onTitleChange,
  onNotesChange,
}: {
  title: string;
  notes: string;
  saveStateLabel: string;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <section className="panel-section">
      <h3>
        Project
        <span className="unsaved-badge save-state-badge">{saveStateLabel}</span>
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

function getSaveStateLabel(isDirty: boolean, browserProjectId: string | null, projectSource: ProjectSource) {
  if (isDirty) return 'Unsaved Changes';
  if (browserProjectId) return 'Saved';
  if (projectSource === 'json') return 'Loaded from JSON - Never Saved to Browser';
  return 'Never Saved';
}

function AlignmentPanel({
  objects,
  selectedObjectId,
  referenceObjectId,
  onReferenceChange,
  onAlign,
}: {
  objects: StudioObject[];
  selectedObjectId: string;
  referenceObjectId: string | null;
  onReferenceChange: (id: string | null) => void;
  onAlign: (action: AlignmentAction) => void;
}) {
  const referenceOptions = objects.filter((object) => object.id !== selectedObjectId);
  const hasReference = Boolean(referenceObjectId && referenceOptions.some((object) => object.id === referenceObjectId));

  return (
    <section className="panel-section">
      <h3>Align Tools</h3>
      <p className="list-empty">Choose a reference object, then align or match the selected object.</p>
      <label className="field">
        <span>Reference Object</span>
        <select value={hasReference ? referenceObjectId ?? '' : ''} onChange={(event) => onReferenceChange(event.target.value || null)}>
          <option value="">Choose reference</option>
          {referenceOptions.map((object) => (
            <option key={object.id} value={object.id}>
              {object.name}
            </option>
          ))}
        </select>
      </label>
      <div className="alignment-grid">
        <button type="button" onClick={() => onAlign('center-origin')}>
          Center on Origin
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('align-x')}>
          Align X
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('align-y')}>
          Align Y
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('align-z')}>
          Align Z
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('match-height')}>
          Match Height
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('match-scale-x')}>
          Match Scale X
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('match-scale-y')}>
          Match Scale Y
        </button>
        <button type="button" disabled={!hasReference} onClick={() => onAlign('match-scale-z')}>
          Match Scale Z
        </button>
      </div>
    </section>
  );
}

function ObjectList({
  objects,
  selectedObjectId,
  onSelect,
  selectionMode,
  moveSelectedOnly,
}: {
  objects: StudioObject[];
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
  selectionMode: SelectionMode;
  moveSelectedOnly: boolean;
}) {
  const panelMovementMessage = moveSelectedOnly
    ? 'Move Panel-Selected Object Only is active. Choose the object here, then move it in the canvas.'
    : selectionMode === 'panel-select-only'
      ? 'Panel Select Only is active. Choose objects here before moving them.'
      : '';

  return (
    <section className="panel-section">
      <h3>Scene Objects</h3>
      {panelMovementMessage && <p className="list-empty">{panelMovementMessage}</p>}
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
              <span>
                {object.name}
                {object.id === selectedObjectId && <strong className="move-hint">Moves with gizmo</strong>}
              </span>
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
  if (object.kind === 'mounting-helper') return 'Mounting Helper';
  if (object.kind === 'annotation') return 'Annotation';
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
      {field === 'position' && (
        <div className="axis-legend" aria-label="Position axis color legend">
          <span className="axis-x">X red</span>
          <span className="axis-y">Y green</span>
          <span className="axis-z">Z blue</span>
        </div>
      )}
      <div className="vector-grid">
        {axes.map((axis, index) => {
          const value = field === 'rotation' ? toDegrees(object[field][index]) : Number(object[field][index].toFixed(3));
          return (
            <label key={axis} className={`field compact-field axis-field axis-field-${axis.toLowerCase()}`}>
              <span className={`axis-label axis-${axis.toLowerCase()}`}>{axis}</span>
              <input type="number" step={field === 'rotation' ? 1 : 0.1} value={value} onChange={(event) => onChange(field, index, event.target.value)} />
            </label>
          );
        })}
      </div>
    </section>
  );
}

function RangeField({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="field range-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
      <output>{value.toFixed(step < 0.01 ? 3 : 2)}</output>
    </label>
  );
}
