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
7. Use Save to save changes to browser storage while iterating.
8. Use Save As Browser Project to create a new browser-saved copy.
9. Export a JSON backup for important work.
10. Export PNG output from the top bar.

## Feature List

- Full-screen Three.js / React Three Fiber product staging canvas
- Simple shape creation: Cube, Cylinder, Sphere, Plane
- GLB/GLTF import with friendlier import errors
- Image planes and decals for PNG, JPG/JPEG, and WEBP
- Transparent PNG logo/label support
- Editable fill/tint, foreground accent, and opacity controls for built-in label and decal placeholders
- Annotation objects: text labels, arrows, dimension lines, and marker dots
- Mounting Helpers for visual hole, slot, washer, rivnut, standoff, bolt-head, centerline, and clearance planning
- Object selection, transform controls, duplicate, delete, lock, and visibility
- Scene Objects Ctrl/Cmd-click multi-select with Group Selected and Ungroup actions
- Linked object groups for translate movement, duplicate, delete, lock/hide, save/load, browser autosave, and JSON export/import
- Browser-local Custom Assemblies saved from selected groups with list metadata, hover details, and reinserted from the Asset Library
- Selection modes for normal canvas picking, panel-only layer selection, and move-panel-selected-only workflows
- Axis direction helper and X/Y/Z color-coded position inputs
- Axis lock buttons for Free, X-only, Y-only, and Z-only movement
- Snap to Grid with 0.125, 0.25, 0.5, and 1.0 snap sizes
- Alignment tools for matching selected object position or scale to a reference object
- Material controls with color, roughness, metalness, and opacity
- Hall Integrated Systems brand color presets
- Material presets for plastics, metals, rubber, prototype gray, clear plastic, and premium black
- Scene templates and product render presets
- Asset Library with reusable grouped starter assets
- Built-in L Bracket asset for product, mount, and fabrication-layout scenes
- Browser project storage with Recent Projects
- JSON project export/import
- One autosave draft with restore prompt
- True high-resolution PNG export
- Camera presets, camera distance, Frame Selected, and Frame All
- Responsive grouped top-bar menus with touch-friendly Hide controls, persistent multi-setting edits, outside-click, and Escape close behavior
- Mobile and tablet responsive shell with bottom dock controls for Add and Properties drawers
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

### Save State and Backups

The project title shows one of three browser-save states: `Never Saved`, `Saved`, or `Unsaved Changes`. `Save` updates the current browser project when one is open; if the project has never been saved to browser storage, Save starts the Save As Browser Project flow. `Save As Browser Project` always creates a new browser-saved copy and makes that copy the current project. `Export JSON Backup` downloads a portable project file but does not change the browser save state. Loading a JSON backup starts from `Loaded from JSON - Never Saved to Browser` until you save it to browser storage.

### Bracket and Amp-Mount Planning

Add the built-in `L Bracket` from Product Parts as a movable, lockable, hideable, snap-aware bracket starting point. Use Mounting Helpers in the left toolbar to place visual round holes, slotted holes, washers, rivnuts, standoffs, bolt heads, centerlines, and clearance zones over brackets or plates. These markers are for layout renders and fabrication notes only; verify real-world hole sizes, spacing, edge distance, fastener clearances, and material requirements before drilling or cutting.

### Snapping and Alignment

Enable `Snap to Grid` in the View menu when placing brackets, rails, posts, standoffs, or mounting-hole markers. Choose a snap size of `0.125`, `0.25`, `0.5`, or `1.0`; position edits, translate-gizmo movement, and duplicate placement snap to that increment. The duplicate offset setting in the View menu controls how far duplicated objects move from the original, and it also respects the active snap size.

Axis locks are snap-aware. Use `X only`, `Y only`, or `Z only` when you want movement constrained to one direction while preserving the other coordinates. This is useful for laying out repeated hole markers, keeping standoffs level, or shifting a row of parts without accidentally changing depth or height.

Use the Align Tools section in the right properties panel to pick a reference object and align the selected object to it. You can center the selected object on the scene origin, align X/Y/Z position to the reference, match height/Y position, or match scale on X/Y/Z. Mounting helpers behave like normal scene objects for snapping, alignment, duplication, save/load, and PNG export.

Suggested amp-mount workflow: add a base plate, add Round Hole or Rivnut markers, enable `Snap to Grid` at `0.25`, duplicate markers with a visible offset, use axis locks to move them along one direction, then use Align Tools to match rows, columns, heights, or repeated marker scale. Treat the result as a visual layout and fabrication communication aid, not a source of drilled-hole dimensions.

### Dense Assembly Selection

Use `Canvas Select + Move` for normal staging where clicking an object selects it. Switch to `Panel Select Only` in the View menu when parts overlap or transform arrows sit over nearby objects; then choose the active layer from the right Scene Objects list and use transform controls without accidental canvas reselection. Enable `Move Panel-Selected Object Only` when the selected object should be controlled only through the panel-selected layer and transform gizmo, with canvas picking suppressed. Use the axis lock buttons near the transform mode controls for `Free`, `X only`, `Y only`, or `Z only` movement when placing real-world parts. Enable `Ignore locked objects in canvas selection` when base plates, rails, amp bodies, or reference parts should stay selectable from the panel but not by canvas clicks.

### Object Grouping

Use Ctrl/Cmd-click in the Scene Objects list to select two or more primitives, assets, image planes, annotations, imported models, or mounting helpers, then choose `Group Selected` in the Properties panel. Groups appear as their own rows with indented child objects, object counts, and lock/visibility state. Selecting a group lets the assembly move together with translate controls while preserving the relative spacing of every child object.

Group movement respects `Free`, `X only`, `Y only`, and `Z only` axis locks. When `Snap to Grid` is enabled, the group movement delta snaps without converting the group into a merged mesh or changing child transforms unexpectedly. Rotate and scale remain object-level controls in v2.8.0; group controls are intentionally translate-only.

Duplicate on a selected group creates a new group with duplicated children and an offset that respects the active duplicate and snap settings. Ungroup removes only the group metadata and leaves child objects in their current world positions. Deleting a selected group deletes the group and its child objects. Group visibility hides members at render/export time without changing child object visibility, and group lock prevents canvas movement/selection while the group remains selectable from the Scene Objects panel.

Grouping is linked object behavior for staging assemblies. It is not CAD boolean merge, mesh union, STL editing, slicing, or geometry cleanup.

### Custom Assemblies

Select a group, then choose `Save Group as Custom Assembly` in the Properties panel to save it as a reusable browser-local assembly. The saved assembly appears under `Custom Assemblies` in the Asset Library with its object count and saved date. Hover an assembly row to see the full name and metadata, and drag the right edge of the desktop Add sidebar wider when names need more room. Duplicate assembly names are kept separate with a numeric suffix such as `Name 2` or `Name 3`. Click the assembly name to insert a fresh copy into the scene; the inserted objects and group receive new IDs, preserve the saved object payloads and materials, appear slightly offset from the current scene center, and select the inserted root group for movement.

Custom assemblies are reusable browser assets, separate from project JSON backups. They stay in the current browser until deleted from the Custom Assemblies library. Deleting a saved library assembly does not remove copies already inserted into the scene. Once inserted, assembly objects and groups behave like normal scene content and save/load through browser projects and JSON export/import.

Custom assemblies are still linked object groups, not CAD boolean merged geometry. Assemblies that contain embedded image planes or GLB/GLTF model data can use noticeably more browser storage.

On desktop, the Translate/Rotate/Scale and Free/X/Y/Z controls live in the fixed header control area rather than floating over the canvas. Standard desktop widths use a compact second header row, while wider layouts can keep the controls inline with the brand and top menus.

The X, Y, and Z fields in the properties panel match the transform colors: X red, Y green, Z blue. Axis lock buttons and the direction helper use the same colors. The View menu also includes a direction helper with +X/-X, +Y/-Y, and +Z/-Z cues for front/back/left/right/up/down orientation while planning real physical layouts such as amp mounts and brackets. The helper and transform controls are editor aids and are hidden from PNG export; mounting helpers remain visible because they are intentional scene objects.

### Mobile Workspace

At phone and tablet widths, the top bar stays available while the Add toolbar and Properties panel move into bottom-dock drawers. Use `Add` to open object, asset, mounting-helper, image, annotation, and import controls. Use `Properties` to open project info, scene objects, transforms, materials, and object-specific settings. Top panels stay open while you make several ordinary setting changes; use the visible `Hide` button when finished. Opening a drawer or another top menu, tapping the canvas, clicking outside, or pressing Escape still closes the active top menu so only one overlay is active at a time. The canvas remains visible behind the drawers for orientation, and desktop layouts keep the standard left toolbar, canvas, and right properties panel.

The header uses the real Hall Integrated Systems circuit H logo from `public/assets/brand/logo-h-circuit-nohalo.png`. A compact boxed H is retained only as a load-error fallback.

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
- Groups and custom assemblies are linked transform metadata, not merged geometry.
- Custom assemblies are browser-local and are not synced across devices or embedded into every project backup.
- The production build currently emits an expected large Three.js bundle warning.
