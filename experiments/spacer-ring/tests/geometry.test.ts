import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRing } from '../src/geometry.ts';

const demo = { outerDiameterMm: 180, innerDiameterMm: 145, thicknessMm: 12 };

// Catches scene-unit normalization, radii mistaken for diameters, and a filled bore.
test('demo geometry has 180 x 180 x 12 mm bounds and a 145 mm opening', () => {
  const mesh = generateRing(demo);
  assert.ok(mesh.vertices.length > 0);
  const bounds = [0, 1, 2].map(axis => [Math.min(...mesh.vertices.map(v => v[axis])), Math.max(...mesh.vertices.map(v => v[axis]))]);
  assert.deepEqual(bounds, [[-90, 90], [-90, 90], [0, 12]]);
  for (const [x, y] of mesh.vertices) {
    const radius = Math.hypot(x, y);
    assert.ok(Math.abs(radius - 90) < 1e-10 || Math.abs(radius - 72.5) < 1e-10);
  }
});

// Catches invalid dimensions silently becoming a solid cylinder, inverted ring, or NaN STL.
test('rejects invalid dimensions before meshing', () => {
  for (const patch of [
    { outerDiameterMm: 0 }, { outerDiameterMm: NaN }, { outerDiameterMm: Infinity },
    { innerDiameterMm: 0 }, { innerDiameterMm: -1 }, { innerDiameterMm: 180 },
    { innerDiameterMm: 179.9 }, { thicknessMm: 0 }, { thicknessMm: -12 },
    { thicknessMm: 251 }, { outerDiameterMm: 1001 },
    { thicknessMm: '12' }, { innerDiameterMm: null },
  ]) assert.throws(() => generateRing({ ...demo, ...patch } as typeof demo));
});
