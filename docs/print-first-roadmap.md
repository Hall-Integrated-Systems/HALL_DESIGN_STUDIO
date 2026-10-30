# Print-first Studio: capabilities and next steps

## Current behavior

The entry page leads to the Spacer Ring Lab and keeps product, branding, installation concepts and free exploration under Visualization workspace. Existing goal links and scene templates remain available. The scene editor's primitives, L bracket, mounting helpers, grouping, imported GLB models and PNG/JSON exports are for visual staging; grouping is not a boolean union and these tools do not create a validated printable part.

The lab generates an annular ring from outside diameter, opening diameter and thickness in millimeters. It checks numeric bounds, mesh dimensions, topology and winding, and re-reads the STL; 3MF is created from the rechecked STL triangle stream. An export report records checks and a hash. These checks do not prove physical dimensional accuracy, material strength, printer compatibility or fit. The numerical limits are not manufacturing specifications. Photo measurements are estimates and require independent physical verification.

## Supported flow

Measure the mating parts and enter dimensions (or use photo assistance as an estimate); generate and inspect the ring; resolve validation errors; export STL or 3MF with its report; review the mesh in Fusion or import it into QIDI's slicer, checking millimeter scale and orientation; slice using material and printer settings appropriate to the application; print a test and measure fit before final use. STL is unitless, so confirm millimeters on import. These files are meshes, not editable native parametric Fusion models.

## Proposed generators — not implemented

- **Mounting brackets:** begin with a constrained flat or L bracket, measured leg lengths, thickness, hole diameters and positions. Validate edge distances, intersections and mesh topology before export; physical load, layer orientation and fastener testing remain separate.
- **Adapters:** define both mating interfaces, offset, clearance and wall thickness. Validate interface geometry and mesh, then test a physical fit. General adapters vary widely and require bounded product-specific templates.
- **Enclosures:** define internal component envelope, walls, lid, mounting points and openings. Validate collisions, minimum dimensions and closed meshes for each part; test fit, heat and electrical requirements independently.

Each proposed workflow needs its own parameter model, geometry generation, failure handling, mesh and export tests, slicer interoperability checks, and physical test evidence before being offered as available. Reuse the ring lab's workflow concepts, export reporting and validation patterns where applicable; its annular geometry-specific checks cannot validate arbitrary shapes unchanged. Add generators one at a time, starting with a tightly scoped bracket only after its requirements and physical validation criteria are defined.
