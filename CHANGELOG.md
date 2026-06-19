# Changelog

## v2.8.1

- Added browser-local Custom Assemblies for saving a selected group as a reusable assembly.
- Added Save Group as Custom Assembly in the Properties panel when a group is selected.
- Added a Custom Assemblies section in the Asset Library with insert and delete actions.
- Inserted custom assemblies clone objects and groups with new IDs, preserve materials and object payloads, and select the inserted root group.
- Custom assemblies are stored separately from project JSON; once inserted, their objects and groups save/export/import as normal scene content.
- Custom assemblies remain linked object assemblies, not CAD boolean merged geometry, and image/model-heavy assemblies can increase browser storage use.

## v2.8.0

- Added core object grouping for linked selection, movement, duplication, lock/hide, save/load, browser autosave, and JSON export/import.
- Added Ctrl/Cmd-click multi-select in Scene Objects plus Group Selected and Ungroup actions in the Properties panel.
- Added clear group rows with indented children, group object counts, and group lock/visibility state in Scene Objects.
- Group movement uses translate-only delta movement so child spacing is preserved; axis locks and Snap to Grid apply to the group delta.
- Group visibility hides members at render/export time without mutating child visibility, and group lock blocks canvas movement/selection while still allowing panel selection.
- Grouped project data remains optional in version 1 project JSON; older JSON without groups still imports normally.
- Reusable custom assemblies, a custom assembly IndexedDB store, CAD boolean merging, mesh union, STL editing, slicing, and geometry cleanup remain deferred.

## v2.7.1

- Moved the desktop transform mode and axis-lock toolbar into the fixed header controls, with a clean second row at standard desktop widths and inline placement on wider screens.
- Kept the compact canvas transform toolbar for tablet and phone layouts, including overlay-aware hiding while top menus or drawers are active.

## v2.7.0

- Replaced the header placeholder with the real Hall Integrated Systems circuit H logo while retaining a boxed H fallback for image-load failures.
- Added a built-in L Bracket under Product Parts with normal selection, transform, lock, visibility, snapping, alignment, save/load, and PNG export behavior.
- Added a touch-friendly Hide button to Templates, Scene, Camera, View, Export, Project, and Help / About panels.
- Kept top panels open during ordinary checkbox, select, input, camera, and view adjustments so several settings can be changed before deliberately closing the panel.
- Preserved outside-click, Escape, top-menu switching, canvas-tap, mobile drawer coordination, and transform-control hiding behavior from v2.6.1.

## v2.6.1

- Fixed mobile and tablet top-menu behavior so opening Add or Properties drawers, tapping the canvas, using Escape, or choosing menu actions closes active top-bar menus.
- Hid transform controls while mobile/tablet menus or drawers are active so View and Project menus no longer block drawer and Scene Objects workflows.
- Extended the responsive drawer shell to tablet widths and tightened top-bar horizontal scrolling to avoid clipped first actions on phone layouts.

## v2.6.0

- Added a mobile responsive shell at narrow phone widths.
- Added bottom dock controls for opening the Add toolbar and Properties panel as mobile drawers.
- Kept the Three.js canvas visible behind mobile panels while preserving the desktop side-panel workspace.
- Improved mobile top-bar spacing and scrolling so menus and quick actions remain reachable on small screens.

## v2.5.0

- Added Snap to Grid with selectable snap sizes and snap-aware position editing, transform movement, and duplication.
- Added duplicate offset setting for clearer fabrication-layout copies.
- Added selected-object alignment and matching tools with a reference-object workflow.
- Added snap/alignment documentation for amp mount, bracket, rail, post, and mounting-helper layout work.

## v2.4.0

- Added clearer browser save states: Never Saved, Saved, and Unsaved Changes.
- Changed Save and Ctrl/Cmd+S to update the current browser project or start Save As when no browser project exists.
- Kept JSON export/import separate from browser save status so JSON backups do not falsely mark projects as saved.
- Updated Project panel and top-bar status text for browser-save clarity.

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
