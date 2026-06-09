# Hall Product Studio

Hall Product Studio is a browser-based 3D product visualization and mockup workspace for Hall Integrated Systems product images, prototype staging, labels, decals, annotations, and clean PNG exports.

It is intentionally lightweight: it helps arrange models, apply materials, create presentation scenes, and export product imagery. It is not CAD software.

Live site:

```text
https://studio.hallintegratedsystems.com
```

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

Build for production:

```bash
npm run build
```

## Basic Workflow

1. Add a Cube, Cylinder, Sphere, or Plane from Simple Shapes in the left toolbar.
2. Import a `.glb` model or add an image plane/decal if needed.
3. Select an object in the canvas or scene object list.
4. Use translate, rotate, or scale controls to stage it.
5. Apply brand colors, material presets, scene templates, or render presets.
6. Add annotations, labels, decals, or simple display assets.
7. Save to browser storage while iterating.
8. Export a JSON backup for important work.
9. Export PNG output from the top bar.

## Feature List

- Full-screen Three.js / React Three Fiber product staging canvas
- Simple shape creation: Cube, Cylinder, Sphere, Plane
- GLB/GLTF import with friendlier import errors
- Image planes and decals for PNG, JPG/JPEG, and WEBP
- Transparent PNG logo/label support
- Annotation objects: text labels, arrows, dimension lines, and marker dots
- Mounting Helpers for visual hole, slot, washer, rivnut, standoff, bolt-head, centerline, and clearance planning
- Object selection, transform controls, duplicate, delete, lock, and visibility
- Selection modes for normal canvas picking, panel-only layer selection, and move-panel-selected-only workflows
- Axis direction helper and X/Y/Z color-coded position inputs
- Axis lock buttons for Free, X-only, Y-only, and Z-only movement
- Material controls with color, roughness, metalness, and opacity
- Hall Integrated Systems brand color presets
- Material presets for plastics, metals, rubber, prototype gray, clear plastic, and premium black
- Scene templates and product render presets
- Asset Library with reusable grouped starter assets
- Browser project storage with Recent Projects
- JSON project export/import
- One autosave draft with restore prompt
- True high-resolution PNG export
- Camera presets, camera distance, Frame Selected, and Frame All
- Responsive grouped top-bar menus with outside-click and Escape close behavior
- Help / About panel with version, shortcuts, storage notes, and limitations

## Common Workflows

### Product Website Image

Use Website Product Tile or Website Banner render presets, frame the selected product, hide the grid, tune materials, and export either `2400x2400` or `1920x1080`.

### Autodesk Application Image

Use the Autodesk Application Image preset, keep the grid hidden, verify shadows are enabled, frame the product, and export `2400x2400`.

### Photoshop or Illustrator Cutout

Use Photoshop Cutout or Transparent Cutout, hide floor/grid/shadows, use transparent background mode, and export `2400x2400`.

### Reusable Prototype Scene

Start from a project template or Asset Library components, add the product model, add decals/annotations, save to browser storage for active work, then export a JSON backup.

### Bracket and Amp-Mount Planning

Use Mounting Helpers in the left toolbar to place visual round holes, slotted holes, washers, rivnuts, standoffs, bolt heads, centerlines, and clearance zones over brackets or plates. These markers are for layout renders and fabrication notes only; verify real-world hole sizes, spacing, edge distance, fastener clearances, and material requirements before drilling or cutting.

### Dense Assembly Selection

Use `Canvas Select + Move` for normal staging where clicking an object selects it. Switch to `Panel Select Only` in the View menu when parts overlap or transform arrows sit over nearby objects; then choose the active layer from the right Scene Objects list and use transform controls without accidental canvas reselection. Enable `Move Panel-Selected Object Only` when the selected object should be controlled only through the panel-selected layer and transform gizmo, with canvas picking suppressed. Use the axis lock buttons near the transform mode controls for `Free`, `X only`, `Y only`, or `Z only` movement when placing real-world parts. Enable `Ignore locked objects in canvas selection` when base plates, rails, amp bodies, or reference parts should stay selectable from the panel but not by canvas clicks.

The X, Y, and Z fields in the properties panel match the transform colors: X red, Y green, Z blue. Axis lock buttons and the direction helper use the same colors. The View menu also includes a direction helper with +X/-X, +Y/-Y, and +Z/-Z cues for front/back/left/right/up/down orientation while planning real physical layouts such as amp mounts and brackets. The helper and transform controls are editor aids and are hidden from PNG export; mounting helpers remain visible because they are intentional scene objects.

## Export Sizes

- `1200x1200`: product tiles and square catalog cards
- `1920x1080`: website banners and widescreen application images
- `2400x2400`: higher-quality square product images
- `Viewport`: quick drafts matching the current canvas

## Deployment

Production deployment target:

```text
https://studio.hallintegratedsystems.com
```

The app is built with Vite and deployed as static files through Azure Static Web Apps. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [CHANGELOG.md](CHANGELOG.md)
- [Deployment](docs/DEPLOYMENT.md)
- [QA Checklist](docs/QA_CHECKLIST.md)
- [Limitations](docs/LIMITATIONS.md)

## Important Notes

- Browser project storage is local to the current browser/device and is not a durable backup.
- Export important work as JSON files.
- Prefer self-contained `.glb` models over external-file `.gltf` packages.
- Large image planes and model data can increase browser storage, project JSON size, and export time.
- Mounting helpers are visual planning markers only and do not cut geometry or validate hardware fit.
- The production build currently emits an expected large Three.js bundle warning.
