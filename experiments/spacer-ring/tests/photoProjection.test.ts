import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measurePhotoDistance } from '../src/photoMeasurement.ts';
import {
  adverseHorizontalOffsets, frontalScene, observePhotoProjection, photoProjectionReport,
  photoProjectionScenarios, physicalEndpoints, pixelLength, projectCameraPoint, projectSegment, shiftPair,
} from './helpers/photoProjectionFixtures.ts';
import type { Point2, PhotoProjectionScenario } from './helpers/photoProjectionFixtures.ts';

function close(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
}

const scenarios = photoProjectionScenarios();
function observation(id: string) {
  const scenario = scenarios.find((item) => item.id === id);
  assert.ok(scenario, `Missing projection scenario ${id}`);
  return observePhotoProjection(scenario);
}

test('independent pinhole sanity: focal scale, depth and principal point have known projections', () => {
  const camera = frontalScene().camera;
  assert.deepEqual(projectCameraPoint([100, 50, 1000], camera), { x: 2240, y: 1620 });
  assert.deepEqual(projectCameraPoint([100, 50, 2000], camera), { x: 2120, y: 1560 });
  assert.deepEqual(projectCameraPoint([0, 0, 500], camera), { x: 2000, y: 1500 });
  assert.throws(() => projectCameraPoint([0, 0, 0], camera), /front/);
});

test('independent physical sanity: rotations and depth offsets preserve true 3D segment lengths', () => {
  for (const scenario of scenarios) {
    for (const segment of [scenario.scene.reference, scenario.scene.target]) {
      const [a, b] = physicalEndpoints(scenario.scene, segment);
      close(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), segment.lengthMm);
      for (const endpoint of [a, b]) assert.ok(endpoint[2] > 0);
    }
  }
});

test('independent projection sanity: frontal lengths follow f L / Z and yaw shortens only one axis', () => {
  const scene = frontalScene();
  close(pixelLength(projectSegment(scene, scene.reference)), 240);
  close(pixelLength(projectSegment(scene, scene.target)), 360);
  const centered = { ...scene, yawDeg: 45,
    reference: { ...scene.reference, centerMm: [0, 0] as const },
    target: { ...scene.target, axisDeg: 90, centerMm: [0, 0] as const },
  };
  const yaw = Math.PI / 4;
  const d = scene.camera.distanceMm;
  const r = scene.reference.lengthMm;
  const expectedReferencePixels = scene.camera.focalLengthPx * r * Math.cos(yaw) * d /
    (d * d - Math.pow(r / 2 * Math.sin(yaw), 2));
  close(pixelLength(projectSegment(centered, centered.reference)), expectedReferencePixels);
  close(pixelLength(projectSegment(centered, centered.target)), 360);
});

test('favorable exact frontal examples recover true length across parallel, perpendicular and diagonal axes', () => {
  for (const scenario of scenarios.filter((item) => item.family === 'favorable')) {
    const result = observePhotoProjection(scenario);
    close(result.proposal.estimateMm, 150);
    assert.equal(result.rangeContainsTruth, true);
  }
});

test('limitation: coplanarity alone does not preserve scale across separated reference locations', () => {
  for (const id of ['yaw30-separated', 'yaw60-separated', 'pitch30-separated']) {
    const result = observation(id);
    assert.equal(result.scenario.scene.reference.depthOffsetMm, 0);
    assert.equal(result.scenario.scene.target.depthOffsetMm, 0);
    assert.ok(Math.abs(result.biasPercent) > 8, `${id} must expose substantial projection bias`);
    assert.equal(result.rangeContainsTruth, false, `${id}: exact landmarks still exclude the known truth`);
  }
  const nearReference = observation('yaw30-near-reference');
  assert.ok(Math.abs(nearReference.biasPercent) < Math.abs(observation('yaw30-separated').biasPercent));
  assert.equal(nearReference.rangeContainsTruth, true, 'This specific nearby case is covered; it is not a general perspective bound.');
});

test('limitation: same-plane cross-axis references can overestimate or underestimate due to foreshortening', () => {
  const yaw = observation('yaw45-cross-axis');
  const pitch = observation('pitch45-cross-axis');
  // Independent closed form for centered horizontal reference at yaw theta:
  // target * sec(theta) * [1 - (reference*sin(theta)/(2*distance))^2].
  const expected = 150 / Math.cos(Math.PI / 4) * (1 - Math.pow(100 * Math.sin(Math.PI / 4) / 2000, 2));
  close(yaw.proposal.estimateMm, expected);
  close(pitch.proposal.estimateMm, expected);
  assert.ok(yaw.biasPercent > 40);
  assert.equal(yaw.rangeContainsTruth, false);
  assert.equal(pitch.rangeContainsTruth, false);
  const reverse = observation('yaw45-reverse-axes');
  assert.ok(reverse.biasPercent < -29);
  assert.equal(reverse.rangeContainsTruth, false);
  assert.equal(observation('yaw30-pitch25-diagonal').rangeContainsTruth, false);
});

test('limitation: optical-axis depth mismatch follows an independent inverse-depth scale ratio', () => {
  for (const id of ['target-100mm-nearer', 'target-100mm-farther', 'depth-near-camera', 'depth-far-camera']) {
    const result = observation(id);
    const { camera, target } = result.scenario.scene;
    const expected = target.lengthMm * camera.distanceMm / (camera.distanceMm + target.depthOffsetMm);
    close(result.proposal.estimateMm, expected);
  }
  assert.equal(observation('target-100mm-nearer').rangeContainsTruth, false);
  assert.equal(observation('target-100mm-farther').rangeContainsTruth, false);
  close(observation('depth-near-camera').biasPercent, 25);
  close(observation('depth-far-camera').biasPercent, 100 / 19);
});

test('distance changes placement bias and pixel span, so this experiment is not a single angle accuracy claim', () => {
  const near = observation('yaw30-near-camera');
  const base = observation('yaw30-separated');
  const far = observation('yaw30-far-camera');
  assert.ok(Math.abs(near.biasPercent) > Math.abs(base.biasPercent));
  assert.ok(Math.abs(base.biasPercent) > Math.abs(far.biasPercent));
  assert.ok(near.proposal.referencePixels > base.proposal.referencePixels);
  assert.ok(base.proposal.referencePixels > far.proposal.referencePixels);
});

test('controlled small-angle sweep has a resolution-dependent coverage crossover for this scene only', () => {
  const angles = [0, 5, 10, 15, 20];
  for (const angle of angles) {
    const high = observation(`yaw-sweep-${angle}deg-high`);
    const low = observation(`yaw-sweep-${angle}deg-low`);
    close(high.proposal.estimateMm, low.proposal.estimateMm);
    close(high.proposal.referencePixels, 3 * low.proposal.referencePixels);
    assert.ok(low.proposal.upperMm - low.proposal.lowerMm > high.proposal.upperMm - high.proposal.lowerMm);
  }
  assert.equal(angles.find((angle) => !observation(`yaw-sweep-${angle}deg-high`).rangeContainsTruth), 5);
  assert.equal(angles.find((angle) => !observation(`yaw-sweep-${angle}deg-low`).rangeContainsTruth), 15);
  // These sampled crossovers depend on placement, axis, span and error allowance;
  // they are neither universal angle limits nor evidence that a lower-resolution image is more accurate.
});

test('finite image resolution and rounding widen the interval even in favorable frontal geometry', () => {
  const high = observation('high-resolution-rounded');
  const low = observation('low-resolution-rounded');
  assert.ok(high.maximumEndpointErrorPx <= Math.SQRT1_2);
  assert.ok(low.maximumEndpointErrorPx <= Math.SQRT1_2);
  assert.equal(high.rangeContainsTruth, true);
  assert.equal(low.rangeContainsTruth, true);
  assert.ok(low.proposal.upperMm - low.proposal.lowerMm > 5 * (high.proposal.upperMm - high.proposal.lowerMm));
  assert.ok(low.proposal.referencePixels >= 40);
});

test('frontal selection interval covers a deterministic 4096-case radial 2-pixel endpoint-error sweep', () => {
  const scene = frontalScene();
  const reference = projectSegment(scene, scene.reference);
  const target = projectSegment(scene, scene.target);
  const offsets: Point2[] = Array.from({ length: 8 }, (_, index) =>
    [2 * Math.cos(index * Math.PI / 4), 2 * Math.sin(index * Math.PI / 4)] as const);
  let evaluated = 0;
  for (const r0 of offsets) for (const r1 of offsets) for (const t0 of offsets) for (const t1 of offsets) {
    const proposal = measurePhotoDistance({
      reference: shiftPair(reference, [r0, r1]), target: shiftPair(target, [t0, t1]), referenceMm: 100,
    });
    assert.ok(proposal.lowerMm <= 150 + 1e-9 && proposal.upperMm >= 150 - 1e-9);
    evaluated += 1;
  }
  assert.equal(evaluated, 4096);
  // This sweep isolates endpoint errors; the perspective failures above use exact endpoints.
});

test('limitation: endpoint errors beyond the default 2 native pixels can exclude truth', () => {
  const bounded = observation('native-2px-adversarial');
  close(bounded.maximumEndpointErrorPx, 2);
  close(bounded.proposal.lowerMm, 150);
  assert.equal(bounded.rangeContainsTruth, true);
  for (const id of ['native-3px-adversarial', 'native-6px-adversarial']) {
    const result = observation(id);
    assert.ok(result.maximumEndpointErrorPx > 2);
    assert.equal(result.rangeContainsTruth, false);
  }
});

test('2 display pixels on a downscaled image need a native-pixel allowance to cover selection error', () => {
  const defaultAllowance = observation('display-2px-native-default');
  const configuredAllowance = observation('display-2px-configured');
  close(defaultAllowance.maximumEndpointErrorPx, 100 / 7);
  assert.equal(defaultAllowance.rangeContainsTruth, false);
  assert.equal(configuredAllowance.rangeContainsTruth, true);
  close(configuredAllowance.proposal.estimateMm, defaultAllowance.proposal.estimateMm);
  close(configuredAllowance.proposal.lowerMm, 150);
});

test('entered reference uncertainty covers stated length error but cannot promise an accurate reference', () => {
  assert.equal(observation('reference-1mm-too-long').rangeContainsTruth, true);
  assert.equal(observation('reference-10mm-too-long').rangeContainsTruth, false);
});

test('synthetic report is deterministic and includes explicit scene geometry and interval scope', () => {
  const first = photoProjectionReport();
  assert.deepEqual(first, photoProjectionReport());
  assert.equal(first.rows.length, 36);
  assert.equal(new Set(first.rows.map((row) => row.id)).size, first.rows.length);
  assert.match(first.methodology.rangeMeaning, /not a probability or a general accuracy guarantee/);
  for (const row of first.rows) {
    assert.equal(row.truthMm, 150);
    assert.ok(Number.isFinite(row.biasPercent));
    assert.ok(row.lowerMm < row.upperMm);
    assert.ok(row.referencePixels >= 40);
    assert.ok(row.targetPixels >= 20);
  }
});

test('a wider endpoint allowance does not repair unmodelled perspective', () => {
  const base = scenarios.find((item) => item.id === 'yaw45-cross-axis')!;
  const scenario: PhotoProjectionScenario = { ...base, endpointUncertaintyPx: 4, offsets: adverseHorizontalOffsets(0) };
  assert.equal(observePhotoProjection(scenario).rangeContainsTruth, false);
});
