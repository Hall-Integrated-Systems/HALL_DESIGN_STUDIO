import { Mesh, MeshBasicMaterial, ShapeUtils, Vector2 } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { toBufferGeometry } from './export.ts';
import { cross, dot, readBinaryStl, subtract } from './validation.ts';
import type { MeshData, Triangle, Vec3 } from './geometry.ts';

export interface HolePattern { count: number; pitchDiameterMm: number; holeDiameterMm: number; rotationDeg: number }
export interface PlateDimensions { outerDiameterMm: number; innerDiameterMm: number; thicknessMm: number; speaker: HolePattern; vehicle: HolePattern }
export interface PlateHole { x: number; y: number; radius: number; group: 'speaker' | 'vehicle' }

export function plateHoles(d: PlateDimensions): PlateHole[] {
  return (['speaker', 'vehicle'] as const).flatMap(group => {
    const p = d[group];
    return Array.from({ length: p.count }, (_, i) => {
      const angle = (p.rotationDeg + i * 360 / p.count) * Math.PI / 180;
      return { x: p.pitchDiameterMm / 2 * Math.cos(angle), y: p.pitchDiameterMm / 2 * Math.sin(angle), radius: p.holeDiameterMm / 2, group };
    });
  });
}

export function validatePlateDimensions(d: PlateDimensions): void {
  if (!d || !d.speaker || !d.vehicle || [d.outerDiameterMm, d.innerDiameterMm, d.thicknessMm, ...(['speaker', 'vehicle'] as const).flatMap(k => Object.values(d[k]))].some(v => typeof v !== 'number' || !Number.isFinite(v))) throw new Error('Enter a valid number for every measurement.');
  if (d.outerDiameterMm < 2 || d.outerDiameterMm > 1000) throw new Error('Outside diameter must be between 2 and 1000 mm.');
  if (d.innerDiameterMm < 1 || d.innerDiameterMm >= d.outerDiameterMm) throw new Error('Opening diameter must be smaller than the outside diameter.');
  if (d.thicknessMm < 3 || d.thicknessMm > 25) throw new Error('Thickness must be between 3 and 25 mm.');
  for (const label of ['speaker', 'vehicle'] as const) {
    const p = d[label];
    if (!Number.isInteger(p.count) || p.count < 1 || p.count > 12) throw new Error(`${label}: number of holes must be a whole number from 1 to 12.`);
    if (p.pitchDiameterMm <= 0 || p.pitchDiameterMm > 1000 || p.holeDiameterMm <= 0 || p.holeDiameterMm > 100 || Math.abs(p.rotationDeg) > 3600) throw new Error(`${label}: check hole size, circle diameter and rotation.`);
  }
  const holes = plateHoles(d);
  for (let i = 0; i < holes.length; i++) {
    const a = holes[i], distance = Math.hypot(a.x, a.y);
    if (distance - a.radius <= d.innerDiameterMm / 2 + 0.05) throw new Error(`${a.group} hole touches or crosses the opening.`);
    if (distance + a.radius >= d.outerDiameterMm / 2 - 0.05) throw new Error(`${a.group} hole touches or crosses the outside edge.`);
    for (const b of holes.slice(0, i)) if (Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius + 0.05) throw new Error('Mounting holes overlap or touch. Adjust a pattern or its rotation.');
  }
}

function circle(x: number, y: number, radius: number, n: number, clockwise: boolean): Vector2[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (clockwise ? -1 : 1) * 2 * Math.PI * i / n;
    return new Vector2(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
  });
}

function generatePlate(d: PlateDimensions): MeshData {
  validatePlateDimensions(d);
  const n = Math.max(64, 4 * Math.ceil(Math.PI / Math.acos(1 - 0.02 / (d.outerDiameterMm / 2)) / 4));
  const contour = circle(0, 0, d.outerDiameterMm / 2, n, false);
  const loops = [contour, circle(0, 0, d.innerDiameterMm / 2, n, true), ...plateHoles(d).map(h => circle(h.x, h.y, h.radius, 32, true))];
  const flat = loops.flat();
  const faces = ShapeUtils.triangulateShape(contour, loops.slice(1));
  const vertices: Vec3[] = [0, d.thicknessMm].flatMap(z => flat.map(p => [p.x, p.y, z] as Vec3));
  const triangles: Triangle[] = [];
  for (const f of faces) {
    const [a, b, c] = f;
    const area = (flat[b].x - flat[a].x) * (flat[c].y - flat[a].y) - (flat[b].y - flat[a].y) * (flat[c].x - flat[a].x);
    const [u, v, w] = area > 0 ? [a, b, c] : [a, c, b];
    triangles.push([u + flat.length, v + flat.length, w + flat.length], [w, v, u]);
  }
  let offset = 0;
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const a = offset + i, b = offset + (i + 1) % loop.length;
      triangles.push([a, b, b + flat.length], [a, b + flat.length, a + flat.length]);
    }
    offset += loop.length;
  }
  return { vertices, triangles };
}

function checkPlate(mesh: MeshData, d: PlateDimensions) {
  const edges = new Map<string, { count: number; direction: number }>();
  const neighbors = mesh.vertices.map(() => new Set<number>());
  let volume = 0;
  for (const t of mesh.triangles) {
    if (new Set(t).size !== 3 || t.some(i => !Number.isInteger(i) || i < 0 || i >= mesh.vertices.length)) throw new Error('Invalid plate triangle.');
    const [a, b, c] = t.map(i => mesh.vertices[i]);
    if (![a, b, c].every(v => v.every(Number.isFinite)) || Math.hypot(...cross(subtract(b, a), subtract(c, a))) < 1e-10) throw new Error('Invalid plate face.');
    volume += dot(a, cross(b, c)) / 6;
    for (let i = 0; i < 3; i++) {
      const u = t[i], v = t[(i + 1) % 3], key = u < v ? `${u},${v}` : `${v},${u}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 }; edge.count++; edge.direction += u < v ? 1 : -1; edges.set(key, edge);
      neighbors[u].add(v); neighbors[v].add(u);
    }
  }
  if ([...edges.values()].some(e => e.count !== 2 || e.direction !== 0)) throw new Error('Plate mesh is open or incorrectly oriented.');
  const seen = new Set<number>(), pending = [0];
  while (pending.length) { const index = pending.pop()!; if (seen.has(index)) continue; seen.add(index); for (const n of neighbors[index]) if (!seen.has(n)) pending.push(n); }
  if (seen.size !== mesh.vertices.length) throw new Error('Plate mesh is disconnected.');
  const holeCount = d.speaker.count + d.vehicle.count;
  const eulerCharacteristic = mesh.vertices.length - edges.size + mesh.triangles.length;
  if (eulerCharacteristic !== -2 * holeCount || volume <= 0) throw new Error('Plate mesh has incorrect hole topology or volume.');
  const min = [0, 1, 2].map(i => Math.min(...mesh.vertices.map(v => v[i])));
  const max = [0, 1, 2].map(i => Math.max(...mesh.vertices.map(v => v[i])));
  if (Math.abs(max[0] - min[0] - d.outerDiameterMm) > 0.001 || Math.abs(max[1] - min[1] - d.outerDiameterMm) > 0.001 || Math.abs(min[2]) > 0.001 || Math.abs(max[2] - d.thicknessMm) > 0.001) throw new Error('Plate dimensions did not match.');
  return { holeCount, boundaryEdges: 0, components: 1, eulerCharacteristic, volumeMm3: volume, triangles: mesh.triangles.length };
}

export function createPlateArtifact(d: PlateDimensions) {
  const mesh = generatePlate(d);
  checkPlate(mesh, d);
  const geometry = toBufferGeometry(mesh), material = new MeshBasicMaterial();
  let bytes: Uint8Array;
  try {
    const object = new Mesh(geometry, material); object.updateMatrixWorld(true);
    const data = new STLExporter().parse(object, { binary: true });
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
  } finally { geometry.dispose(); material.dispose(); }
  const decoded = readBinaryStl(bytes);
  const report = checkPlate(decoded, d);
  mesh.triangles.forEach((triangle, i) => triangle.forEach((v, j) => {
    if (decoded.vertices[decoded.triangles[i][j]].some((x, axis) => x !== Math.fround(mesh.vertices[v][axis]))) throw new Error('Plate STL round trip mismatch.');
  }));
  return { mesh, bytes, report };
}
