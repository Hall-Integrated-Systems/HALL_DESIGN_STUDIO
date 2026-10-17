import type { MeshData, RingDimensions, Vec3 } from './geometry.ts';
import { DIMENSION_TOLERANCE_MM as EPS, MAX_CHORD_ERROR_MM, segmentCount } from './geometry.ts';

export const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function validateRing(mesh: MeshData, d: RingDimensions) {
  const n = segmentCount(d);
  const { vertices, triangles } = mesh;
  if (vertices.length !== 4 * n || triangles.length !== 8 * n) throw new Error('Unexpected ring vertex or triangle count.');
  const r = d.innerDiameterMm / 2, R = d.outerDiameterMm / 2, h = d.thicknessMm;
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const uniqueVertices = new Set<string>();
  for (const v of vertices) {
    if (v.length !== 3 || !v.every(Number.isFinite)) throw new Error('Non-finite vertex.');
    const key = v.join(',');
    if (uniqueVertices.has(key)) throw new Error('Duplicate indexed vertex.');
    uniqueVertices.add(key);
    const radius = Math.hypot(v[0], v[1]);
    if (Math.min(Math.abs(radius - r), Math.abs(radius - R)) > EPS) throw new Error('Incorrect bore or outside radius.');
    if (Math.min(Math.abs(v[2]), Math.abs(v[2] - h)) > EPS) throw new Error('Incorrect thickness or Z origin.');
    v.forEach((x, axis) => { min[axis] = Math.min(min[axis], x); max[axis] = Math.max(max[axis], x); });
  }
  const near = (a: number, b: number) => Math.abs(a - b) <= EPS;
  if (!near(min[0], -R) || !near(min[1], -R) || !near(min[2], 0) || !near(max[0], R) || !near(max[1], R) || !near(max[2], h)) throw new Error('Bounding dimensions or scale are incorrect.');
  const edges = new Map<string, { count: number; direction: number }>();
  const faces = new Set<string>();
  const neighbors = vertices.map(() => new Set<number>());
  const links = vertices.map(() => new Map<number, Set<number>>());
  let volume = 0, surfaceArea = 0, maxChordError = 0, minOpeningAcrossFlats = Infinity;
  for (const t of triangles) {
    if (t.length !== 3 || t.some(i => !Number.isInteger(i) || i < 0 || i >= vertices.length) || new Set(t).size !== 3) throw new Error('Invalid triangle indices.');
    const faceKey = [...t].sort((a, b) => a - b).join(',');
    if (faces.has(faceKey)) throw new Error('Duplicate triangle.');
    faces.add(faceKey);
    const [a, b, c] = t.map(i => vertices[i]);
    const normal = cross(subtract(b, a), subtract(c, a));
    const twiceArea = Math.hypot(...normal);
    if (!(twiceArea > 1e-12)) throw new Error('Degenerate triangle.');
    surfaceArea += twiceArea / 2;
    volume += dot(a, cross(b, c)) / 6;
    for (let k = 0; k < 3; k++) {
      const u = t[k], v = t[(k + 1) % 3], w = t[(k + 2) % 3];
      const key = u < v ? `${u},${v}` : `${v},${u}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count++; edge.direction += u < v ? 1 : -1;
      edges.set(key, edge); neighbors[u].add(v); neighbors[v].add(u);
      if (!links[u].has(v)) links[u].set(v, new Set());
      if (!links[u].has(w)) links[u].set(w, new Set());
      links[u].get(v)!.add(w); links[u].get(w)!.add(v);
      const p = vertices[u], q = vertices[v];
      // Every generated face stays inside one angular sector; reject crossed annulus faces.
      const cosine = (p[0] * q[0] + p[1] * q[1]) / (Math.hypot(p[0], p[1]) * Math.hypot(q[0], q[1]));
      if (cosine < Math.cos(2 * Math.PI / n) - 1e-7) throw new Error('Face crosses angular sectors.');
      if (near(Math.hypot(p[0], p[1]), Math.hypot(q[0], q[1]))) {
        const radius = Math.hypot(p[0], p[1]);
        maxChordError = Math.max(maxChordError, radius - Math.hypot((p[0] + q[0]) / 2, (p[1] + q[1]) / 2));
      }
      const chordLength = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (chordLength > EPS && near(Math.hypot(p[0], p[1]), r) && near(Math.hypot(q[0], q[1]), r)) {
        minOpeningAcrossFlats = Math.min(minOpeningAcrossFlats, 2 * Math.abs(p[0] * q[1] - p[1] * q[0]) / chordLength);
      }
    }
  }
  const boundaryEdges = [...edges.values()].filter(e => e.count === 1).length;
  const nonManifoldEdges = [...edges.values()].filter(e => e.count !== 2).length;
  if (boundaryEdges || nonManifoldEdges || [...edges.values()].some(e => e.direction !== 0)) throw new Error('Mesh is open, non-manifold, or inconsistently wound.');
  function visit(graph: Map<number, Set<number>>, start: number) {
    const seen = new Set<number>(), queue = [start];
    while (queue.length) { const i = queue.pop()!; if (seen.has(i)) continue; seen.add(i); for (const j of graph.get(i) ?? []) if (!seen.has(j)) queue.push(j); }
    return seen;
  }
  const graph = new Map(neighbors.map((adj, i) => [i, adj]));
  if (visit(graph, 0).size !== vertices.length) throw new Error('Mesh has disconnected or unused vertices.');
  for (const link of links) {
    if ([...link.values()].some(adj => adj.size !== 2) || visit(link, link.keys().next().value!).size !== link.size) throw new Error('Non-manifold vertex link.');
  }
  const eulerCharacteristic = vertices.length - edges.size + triangles.length;
  if (eulerCharacteristic !== 0) throw new Error('Ring through-hole topology is incorrect.');
  const expectedPolygonVolume = n / 2 * Math.sin(2 * Math.PI / n) * (R * R - r * r) * h;
  if (volume <= 0 || Math.abs(volume - expectedPolygonVolume) > Math.max(1e-8, surfaceArea * EPS)) throw new Error('Volume or outward winding is incorrect.');
  if (maxChordError > MAX_CHORD_ERROR_MM + EPS) throw new Error('Tessellation exceeds chord-error limit.');
  return {
    vertices: vertices.length, triangles: triangles.length, edges: edges.size,
    boundaryEdges, nonManifoldEdges, components: 1, eulerCharacteristic,
    volumeMm3: volume, analyticVolumeMm3: Math.PI * (R * R - r * r) * h,
    maxChordErrorMm: maxChordError,
    minOpeningAcrossFlatsMm: minOpeningAcrossFlats,
    boundsMm: { min, max, size: max.map((v, i) => v - min[i]) },
  };
}

/** Strict binary STL reader for this bounded generator, not a general STL repair/import service. */
export function readBinaryStl(bytes: Uint8Array): MeshData {
  if (bytes.byteLength < 84) throw new Error('Truncated STL header.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  if (count < 1 || count > 32768 || bytes.byteLength !== 84 + count * 50) throw new Error('STL length or triangle count is invalid.');
  const mesh: MeshData = { vertices: [], triangles: [] }, index = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const offset = 84 + i * 50;
    const vector = (base: number): Vec3 => [0, 4, 8].map(j => view.getFloat32(base + j, true)) as Vec3;
    const normal = vector(offset), points = [12, 24, 36].map(j => vector(offset + j));
    if (![normal, ...points].every(v => v.every(Number.isFinite))) throw new Error('Non-finite STL data.');
    if (view.getUint16(offset + 48, true) !== 0) throw new Error('Unexpected STL attribute data.');
    const actual = cross(subtract(points[1], points[0]), subtract(points[2], points[0]));
    const area = Math.hypot(...actual);
    if (area <= 1e-12 || Math.abs(Math.hypot(...normal) - 1) > 1e-5 || dot(actual, normal) / area < 0.99999) throw new Error('Invalid STL facet normal or degenerate triangle.');
    mesh.triangles.push(points.map(p => {
      const key = p.join(',');
      if (!index.has(key)) { index.set(key, mesh.vertices.length); mesh.vertices.push(p); }
      return index.get(key)!;
    }) as [number, number, number]);
  }
  return mesh;
}
