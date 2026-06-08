# Limitations

Hall Product Studio is intentionally a lightweight product staging and mockup tool. It is not a CAD, slicing, or offline rendering application.

## Not CAD Software

The app is for arranging existing models, primitives, labels, annotations, and reusable staging components. It does not provide parametric modeling, constraints, sketches, booleans, mesh repair, STL editing, manufacturing validation, or slicing.

## Visual Dimensions Only

Dimension lines are visual annotations for product concepts, explainers, and mockups. They are not CAD measurements and should not be used as manufacturing references. Auto-length displays scene-unit distance between annotation points.

Mounting helpers are also visual planning markers only. Round hole, slot, washer, rivnut, standoff, bolt-head, centerline, and clearance-zone markers do not cut geometry, validate fit, calculate edge distances, or replace fabrication drawings. Verify real-world hole sizes, fastener specifications, clearances, and material requirements before drilling or cutting.

## GLB Preferred

Self-contained `.glb` files are the most reliable import format. `.gltf` files that depend on external `.bin` files or texture paths may fail or reload incorrectly unless those dependencies are embedded or otherwise available to the browser.

## Browser Storage Limits

Browser project storage uses local browser storage on the current device and profile. It is convenient for active work, but it is not a durable backup. Browser data can be cleared by the user, browser cleanup tools, private browsing behavior, or site-data reset.

Export important work as JSON files and store those files with the related product assets.

## Large Image and Model Performance

Imported models and image planes can be embedded as data URLs in saved project data. Large files can increase:

- browser memory usage
- IndexedDB storage usage
- JSON project file size
- save/load time
- export time

Use web-sized PNG/JPG/WEBP assets for labels, decals, and logos when practical. Prefer optimized GLB files for product models.

## Rendering Limits

The renderer is real-time Three.js, not an offline product renderer. Current limitations include:

- limited reflection realism
- limited glass/refraction realism
- no depth-of-field workflow
- no advanced physically based studio renderer
- approximate shadows
- no true brushed anisotropy controls

## Three.js Bundle Warning

Production builds currently emit a large chunk warning because Three.js, React Three Fiber, Drei, and related rendering utilities are bundled into the app. This warning is expected for the current architecture and does not indicate a failed build.

Future optimization could split vendor chunks or lazy-load heavier rendering/import paths, but that is outside the v2.0 hardening scope.
