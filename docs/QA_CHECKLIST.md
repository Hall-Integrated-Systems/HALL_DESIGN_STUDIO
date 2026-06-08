# QA Checklist

Use this checklist before release or after deployment.

## Local Build

- Run `npm install` on a clean checkout.
- Run `npm run build`.
- Confirm the production build completes.
- Note the expected Three.js bundle-size warning if present.

## App Smoke Test

- Open the local app or deployed site.
- Confirm no browser console errors on initial load.
- Confirm Help / About shows version `2.0.0`.
- Confirm top-bar menus close on outside click, Escape, and when another menu opens.
- Confirm the left toolbar remains scrollable and readable.

## Simple Shapes

- Add Cube, Cylinder, Sphere, and Plane from Simple Shapes.
- Confirm each appears in the scene object list with useful names.
- Select each object from the canvas or object list.
- Move, rotate, scale, duplicate, delete, lock, and hide at least one object.

## GLB Import

- Import a self-contained `.glb` model.
- Confirm it appears centered and scaled to a usable scene size.
- Select, transform, duplicate, hide, and delete the imported model.
- Confirm broken or unsupported model imports show a friendly error.

## PNG Transparency Import

- Import a transparent PNG logo or label.
- Confirm transparency renders correctly as an image plane.
- Confirm opacity, double-sided, preserve-aspect, and tint controls still work.
- Confirm the image plane appears in the scene object list.

## Annotations

- Add a text label.
- Add an arrow callout.
- Add a dimension line.
- Add a marker/dot.
- Confirm annotation-specific controls work in the right panel.
- Confirm annotations appear in exported PNG output.

## Browser Save/Open

- Create a small scene.
- Save it to browser storage.
- Reload the page.
- Open the saved project from Recent Projects.
- Confirm objects, notes, scene settings, and camera setup are restored.
- Duplicate and delete a browser-saved project.

## JSON Export/Import

- Export the current project as a JSON file.
- Clear the scene.
- Load the exported JSON project.
- Confirm objects, metadata, scene settings, image planes, annotations, and saved model data restore.
- Try an invalid JSON file and confirm a friendly failure message appears.

## High-Resolution PNG Export

- Export current viewport PNG.
- Export `1200x1200`.
- Export `1920x1080`.
- Export `2400x2400`.
- Confirm transparent background mode exports with transparency when selected.
- Confirm image planes and annotations appear in the export.

## Live Deployment Check

- Visit `https://studio.hallintegratedsystems.com`.
- Confirm the app loads without console errors.
- Confirm Help / About shows the expected version.
- Add a simple shape and export a PNG.
- Confirm browser storage and JSON export/import work on the deployed site.
