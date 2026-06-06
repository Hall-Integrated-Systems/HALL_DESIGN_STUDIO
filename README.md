# Hall Product Studio

Hall Product Studio is a lightweight browser-based 3D product visualization workspace for staging prototype and product mockups. It is designed for quick arrangement, material tuning, and clean image export rather than CAD modeling.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Usage

- Add primitive objects from the left toolbar.
- Import `.glb` or `.gltf` files from the import button.
- Import `.png`, `.jpg`, `.jpeg`, or `.webp` images as flat image planes.
- Insert reusable assets from the Asset Library in the left toolbar.
- Use built-in starter assets such as H Logo Placeholder, Product Base Plate, Simple Display Stand, Wall Mount Plate, Small Bracket, Label Tag, and Screw Boss Placeholder.
- Reinsert models from the Imported Models asset list after importing them once in the current session.
- Reinsert imported images from the Image / Decal asset list after importing them once in the current session.
- Start a repeatable setup from New From Template in the top bar.
- Click an object in the canvas to select it.
- Select objects from the scene object list when canvas selection is inconvenient.
- Use the transform mode selector to move, rotate, or scale the selected object.
- Edit position, rotation, scale, color, roughness, metalness, and opacity in the right properties panel.
- For image planes, edit opacity, double-sided rendering, aspect-ratio preservation, and tint color.
- Use HIS brand color presets for quick, consistent prototype and product mockup colors.
- Use material presets such as matte plastic, satin metal, rubber black, clear plastic, prototype gray, and premium black.
- Add a project title and notes so saved project JSON remembers what the render is for.
- Lock objects to prevent accidental transform-control movement.
- Hide objects without deleting them.
- Use the camera presets for front, back, left, right, top, and isometric product views.
- Use the camera distance slider to tighten or loosen framing.
- Use Frame Selected to center the camera on the active object, or Frame All to fit all visible objects.
- Switch between dark, light, and transparent screenshot backgrounds.
- Toggle the floor, grid, and shadows for cleaner product exports.
- Apply scene templates for common product photography setups:
  - Catalog White for clean store tiles.
  - Dark Premium for high-contrast presentation images.
  - Transparent Cutout for compositing in Photoshop or Illustrator.
  - Workbench Layout for layout and arrangement work.
- Apply product render presets for repeatable output:
  - Website Product Tile sets a transparent square high-resolution export and frames the selected object.
  - Website Banner uses a dark premium scene, `1920x1080`, and frames the whole layout.
  - Autodesk Application Image uses a clean white catalog setup, hidden grid, shadows, and `2400x2400`.
  - Photoshop Cutout uses a transparent, floorless, shadowless `2400x2400` setup.
- Clear Scene removes scene objects while preserving project title, notes, and scene settings.
- Watch the Unsaved indicator near the project title after scene, metadata, camera, or settings changes.
- Duplicate or delete the selected object from the properties panel.
- Save the project as JSON from the top bar.
- Load a saved JSON project from the top bar.
- Choose a screenshot output size, edit the export filename, then export a PNG from the top bar.
- Reset the camera from the top bar.

## Export Workflow

1. Arrange the object or imported model in the scene.
2. Apply brand color and material presets to keep the render consistent with Hall Integrated Systems visual language.
3. Apply a scene template or product render preset, or manually choose background, floor, grid, and shadow settings.
4. Choose a camera preset, then use Distance, Frame Selected, or Frame All to refine the composition.
5. Choose an export size:
   - `1200x1200` for product tiles and square catalog cards.
   - `1920x1080` for website banners and widescreen application images.
   - `2400x2400` for higher-quality square product images.
   - `Viewport` for quick drafts that match the current canvas.
6. Use transparent background mode when exporting cutouts for Photoshop, Illustrator, or other compositing workflows.
7. Edit the export filename only when you want to override the selected-object filename fallback, then click Export PNG.

## Asset Library

The Asset Library groups reusable components into Logos, Product Parts, Fixtures / Stands, Background Props, Image / Decal, and Imported Models.

Built-in assets are made from grouped primitives. Each inserted asset behaves as one selectable scene object for transform, duplicate, delete, save, load, visibility, lock, and material editing. This is meant for product staging and mockups, not detailed part modeling.

Imported `.glb` or `.gltf` files are added to the Imported Models section for the current browser session after import. You can insert another copy without choosing the file again. Imported model history is session-only; saved projects still include imported model data for objects already placed in the scene.

Imported images are added to the Image / Decal section for the current browser session after import. You can insert another copy without choosing the file again. Built-in decal helpers include Blank Label, Product Tag, Front Logo Placement Guide, and Side Decal Placement Guide.

Grouping is intentionally simple in v1.6. A grouped built-in asset transforms as one object, and its parts are not individually selectable or editable through a nested hierarchy yet.

## Image Planes and Decals

Use Import Image to add PNG, JPG/JPEG, or WEBP files as flat planes in the 3D scene. Image planes are selectable, transformable, duplicatable, deletable, lockable, hideable, and saved in project JSON.

Transparent PNG logos keep their alpha channel, making them useful for HIS logo mockups, product markings, label art, front-panel graphics, and Photoshop/Illustrator cutout workflows. The high-resolution PNG exporter includes image planes in the render, including transparent-background exports.

Image planes preserve aspect ratio by default by sizing the inserted plane from the source image dimensions. The Preserve aspect ratio toggle can restore the imported image ratio based on the current height scale. For decals, rotate and position the plane slightly in front of the target face to avoid visual overlap.

## Project Templates

New From Template creates a fresh scene from a centralized project template. If the scene already has objects or unsaved changes, Hall Product Studio asks for confirmation before replacing the current scene.

Available templates:

- Blank Studio: empty dark workbench scene for scratch staging.
- Website Product Tile: transparent `2400x2400` setup for square product tiles.
- Website Banner: dark premium `1920x1080` setup for hero/support images.
- Autodesk Application Image: clean white `2400x2400` setup for technical application imagery.
- Photoshop Cutout: transparent, floorless, shadowless `2400x2400` setup for compositing.
- Product Base Display: adds Product Base Plate and Simple Display Stand with catalog settings.
- Bracket / Mount Concept: adds Wall Mount Plate, Small Bracket, and Screw Boss Placeholder for quick mounting concepts.
- Logo Hero Render: adds H Logo Placeholder with a dark premium widescreen setup.
- Workbench Review Scene: adds starter review props with grid-enabled workbench settings.

Each template sets scene settings, camera preset, camera distance, export size, project title, starter notes, and any starter built-in assets. Templates do not use external storage or delete anything without confirmation.

## Suggested Workflows

For product website images, import or build the product, select the main object, apply a brand color or material preset, then use Website Product Tile for square assets or Website Banner for widescreen hero/support images. Use Frame Selected for single-product tiles and Frame All for grouped scenes.

For Autodesk application images, use the Autodesk Application Image preset, keep the grid hidden, verify shadows are enabled, and export at `2400x2400`. Prototype Gray, Satin Metal, Brushed Aluminum, and HIS Blue are good starting materials for technical product mockups.

For Photoshop or Illustrator compositing, use Photoshop Cutout or Transparent Cutout, hide floor/grid/shadows, and export `2400x2400` PNGs with transparent background.

For repeatable product scenes, start with Product Base Plate or Simple Display Stand, add brackets, label tags, or logo placeholders, then import the real product model. Save the project JSON once the scene layout, title, notes, camera framing, and render preset are dialed in.

For fastest product image creation, choose a project template first, import or insert the product model, apply HIS brand/material presets, use Frame Selected or Frame All, then export the recommended PNG size. Save the JSON once the scene becomes a reusable starting point.

## Notes

Saved projects include app version, save timestamp, project title, notes, primitive object settings, built-in asset identifiers and grouped primitive structure, imported models and imported images as local data URLs, scene display settings, object lock state, and object visibility. Large imported models or high-resolution images can produce large JSON project files. The unsaved indicator resets after save, load, or creating a new scene from a template.

Imported models are auto-centered and normalized to a practical staging size. For best project save/load behavior, prefer self-contained `.glb` files. `.gltf` files that depend on external `.bin` or texture files may not reload correctly unless those references are embedded or otherwise available.

Fixed-size screenshot exports render the WebGL scene at the chosen output resolution before downloading the PNG. Very large or complex models can take a moment to export at `2400x2400`, depending on the GPU and browser.

The renderer is still a lightweight real-time Three.js workspace, not an offline product renderer. Reflections, depth of field, color management, advanced shadows, true brushed anisotropy, glass refraction, and texture relinking for multi-file `.gltf` imports are intentionally limited in v1.6.

Built-in assets are approximate staging helpers, not manufacturing geometry. Imported model and imported image history are not persisted as reusable libraries across browser reloads unless the asset has been placed in a saved project.

Project templates are starting points. They can insert built-in assets and configure the scene, but they do not preserve custom local imported model history across reloads.

Very large images consume browser memory and can make project JSON files heavy because image data is embedded as data URLs. Use web-sized PNG/JPG/WEBP assets for labels and logos when practical.

## Layout Verification

Before shipping UI changes, check:

- Ultrawide full screen: top controls stay compact and grouped.
- `1920x1080` full screen: top bar does not crowd or overflow horizontally.
- Half-screen window: menus remain usable and side panels do not cover each other.
- Narrow window: top bar wraps, properties panel scrolls from the bottom, and key controls remain reachable.
- Right panel scroll check: material presets, object list, project notes, and transforms remain reachable.
- Canvas resize check: the 3D canvas fills the remaining workspace after browser resize.
