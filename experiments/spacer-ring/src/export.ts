import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { DIMENSION_TOLERANCE_MM, generateRing, MAX_CHORD_ERROR_MM, segmentCount } from './geometry.ts';
import type { MeshData, RingDimensions } from './geometry.ts';
import { readBinaryStl, validateRing } from './validation.ts';

export function toBufferGeometry(mesh: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
  geometry.setIndex(mesh.triangles.flat());
  return geometry;
}

export function createArtifact(dimensions: RingDimensions) {
  const parameters = { ...dimensions };
  const mesh = generateRing(parameters);
  const source = validateRing(mesh, parameters);
  const geometry = toBufferGeometry(mesh);
  const material = new MeshBasicMaterial();
  let bytes: Uint8Array;
  try {
    // An identity mesh ONLY. Never export the preview scene, helpers, or a normalized import.
    const object = new Mesh(geometry, material);
    object.updateMatrixWorld(true);
    const data = new STLExporter().parse(object, { binary: true });
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
    const header = new TextEncoder().encode('HIS spacer ring POC | coordinates intended as mm | import at 100% | DEMO');
    bytes.set(header, 0); // Advisory text only: STL has no standardized unit field.
  } finally { geometry.dispose(); material.dispose(); }
  const decoded = readBinaryStl(bytes);
  const roundTrip = validateRing(decoded, parameters);
  // Ensure the emitted float32 triangle stream matches the source, not merely its bounding box.
  mesh.triangles.forEach((t, i) => t.forEach((v, j) => {
    const actual = decoded.vertices[decoded.triangles[i][j]];
    if (actual.some((x, axis) => x !== Math.fround(mesh.vertices[v][axis]))) throw new Error('STL round-trip vertex mismatch.');
  }));
  const baseName = `HIS_spacer_DEMO_OD${parameters.outerDiameterMm}_ID${parameters.innerDiameterMm}_H${parameters.thicknessMm}_mm`;
  return { mesh, bytes, baseName, report: {
    schemaVersion: 1, generator: 'HIS isolated spacer-ring POC v0.1.0', units: 'mm',
    parameters, segments: segmentCount(parameters), numericalToleranceMm: DIMENSION_TOLERANCE_MM,
    requestedMaxChordErrorMm: MAX_CHORD_ERROR_MM, byteLength: bytes.length,
    stlValidated: true, source, roundTrip,
    limitations: ['Demonstration dimensions; no vehicle or speaker fitment claim.', 'STL is unitless; import as millimeters at 100% scale.', 'Polygonal bore is slightly smaller between vertices; no fit compensation applied.', 'No material, fastener, strength, slicing, printer, or physical validation.'],
  } };
}

export type Artifact = ReturnType<typeof createArtifact>;
