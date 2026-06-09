# Changelog

## v2.3.0

- Added Move Panel-Selected Object Only wording and workflow for dense assembly movement.
- Added Free, X-only, Y-only, and Z-only axis movement lock controls for translate operations.
- Improved Scene Objects selected-row clarity with a movement hint for the active layer.
- Upgraded direction helper and axis color consistency across movement controls, position fields, and helper labels.

## v2.2.1

- Strengthened panel-driven movement for dense assemblies with a Move Selected Only toggle.
- Improved transform-control pointer handling so dragging gizmo handles does not select objects underneath.
- Upgraded axis color clarity in the properties panel and expanded the editor-only orientation helper to show positive and negative directions.

## v2.2.0

- Added Canvas Select + Move and Panel Select Only workflows for dense overlapping scenes.
- Added an Ignore locked objects in canvas selection toggle.
- Added X/Y/Z color cues in the properties panel and an editor-only axis direction helper.
- Kept transform controls, selection bounds, and the axis helper hidden from PNG export while mounting helpers still export normally.

## v2.1.0

- Added Mounting Helpers for visual fabrication planning.
- Added one-click markers for round holes, slotted holes, washers, rivnuts, standoffs, bolt heads, centerlines, and clearance zones.
- Added helper-specific right-panel controls for color, opacity, and practical dimensions where applicable.
- Mounting helpers save/load with project JSON and export in PNG renders when visible.

## v2.0.0

Release hardening pass for Hall Product Studio. Adds release documentation, deployment notes, QA checklist, limitations documentation, and a cleaner README. The app version shown in Help / About is now `2.0.0`.

## v1.9.x

- Added app-wide toast/status messages.
- Added friendlier errors for imports, JSON loading, and export failures.
- Added Help / About with app version, live site, supported imports, shortcuts, storage guidance, and limitations.
- Added keyboard shortcuts for Delete, Escape, Ctrl/Cmd+S, and Ctrl/Cmd+E.
- Improved top-bar menu behavior so menus close on outside click, Escape, or when another menu opens.
- Made Simple Shapes and Help / About more visible.
- Polished left-toolbar spacing and section readability.

## v1.8.x

- Added browser-local project storage with IndexedDB.
- Added Recent Projects with open, duplicate, and delete actions.
- Added one autosave draft with restore prompt after reload.
- Added custom browser-local render presets.
- Added storage safety warnings for large projects and image-heavy scenes.

## v1.7.0

- Added annotation objects: text labels, arrow callouts, dimension lines, and marker dots.
- Added annotation controls for text, color, size, line points, face-camera behavior, and dimension labels.
- Included annotations in high-resolution PNG export.

## v1.6.0

- Added image plane and decal import for PNG, JPG/JPEG, and WEBP.
- Preserved PNG transparency for logos, labels, and product graphics.
- Added built-in image/decal placeholders and in-session imported image reuse.

## v1.5.x

- Added project templates and New From Template workflow.
- Added dirty-state tracking, clear scene behavior, and responsive grouped top-bar controls.
- Improved reduced-width usability and right-panel scrolling.

## v1.4.0

- Added Asset Library categories and reusable built-in grouped assets.
- Added in-session imported model reuse.
- Added basic grouped asset behavior for transform, duplicate, delete, save, and load.

## v1.3.0

- Added Hall Integrated Systems brand color presets.
- Added material presets for plastics, metals, rubber, glass/clear plastic, prototype gray, and premium black.
- Added product render presets and project metadata fields.

## v1.2.0

- Added true high-resolution PNG export at selected target resolution.
- Added export filename controls.
- Added scene templates, camera distance, Frame Selected, and Frame All.

## v1.1.0

- Added bounding-box selection outlines for primitives and imported models.
- Added camera presets, background modes, floor/grid/shadow toggles, object lock/visibility, object list, and improved import normalization.

## v1.0.0

- Initial browser-based 3D product staging workspace.
- Added Three.js/R3F canvas, orbit controls, grid floor, studio lighting, primitives, GLB/GLTF import, object selection, transform controls, material editing, duplicate/delete, JSON save/load, screenshot export, and reset camera.
