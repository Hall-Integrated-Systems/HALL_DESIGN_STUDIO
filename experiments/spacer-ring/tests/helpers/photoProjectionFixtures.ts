import { measurePhotoDistance } from '../../src/photoMeasurement.ts';
import type { PhotoDistanceProposal, PhotoPair, PhotoPoint } from '../../src/photoMeasurement.ts';

export type Vector3 = readonly [number, number, number];
export type Point2 = readonly [number, number];

export interface PinholeCamera {
  focalLengthPx: number;
  imageWidthPx: number;
  imageHeightPx: number;
  distanceMm: number;
}

export interface PhysicalSegment {
  lengthMm: number;
  axisDeg: number;
  /** In-plane coordinates before yaw, then pitch, rotate the scene. */
  centerMm: Point2;
  /** Added along the camera optical axis after rotation. Zero is coplanar. */
  depthOffsetMm: number;
}

export interface ProjectionScene {
  camera: PinholeCamera;
  yawDeg: number;
  pitchDeg: number;
  reference: PhysicalSegment;
  target: PhysicalSegment;
}

export interface LandmarkOffsets {
  reference: readonly [Point2, Point2];
  target: readonly [Point2, Point2];
}

export interface PhotoProjectionScenario {
  id: string;
  family: 'favorable' | 'perspective' | 'depth' | 'resolution' | 'landmarks' | 'reference';
  description: string;
  scene: ProjectionScene;
  enteredReferenceMm?: number;
  referenceUncertaintyMm?: number;
  endpointUncertaintyPx?: number;
  offsets?: LandmarkOffsets;
  roundToPixel?: boolean;
}

const radians = (degrees: number): number => degrees * Math.PI / 180;

/** Independent pinhole renderer: no photo estimator formulas are used here. */
export function projectCameraPoint(point: Vector3, camera: PinholeCamera): PhotoPoint {
  if (point[2] <= 0) throw new Error('A projected point must be in front of the camera.');
  return {
    x: camera.imageWidthPx / 2 + camera.focalLengthPx * point[0] / point[2],
    y: camera.imageHeightPx / 2 + camera.focalLengthPx * point[1] / point[2],
  };
}

export function physicalEndpoints(scene: ProjectionScene, segment: PhysicalSegment): readonly [Vector3, Vector3] {
  const yaw = radians(scene.yawDeg);
  const pitch = radians(scene.pitchDeg);
  const axis = radians(segment.axisDeg);
  const endpoint = (side: number): Vector3 => {
    const u = segment.centerMm[0] + side * segment.lengthMm / 2 * Math.cos(axis);
    const v = segment.centerMm[1] + side * segment.lengthMm / 2 * Math.sin(axis);
    // Rotate yaw around Y, then pitch around X; the camera looks along +Z.
    const x = Math.cos(yaw) * u;
    const yawZ = -Math.sin(yaw) * u;
    const y = Math.cos(pitch) * v - Math.sin(pitch) * yawZ;
    const z = Math.sin(pitch) * v + Math.cos(pitch) * yawZ;
    return [x, y, scene.camera.distanceMm + z + segment.depthOffsetMm];
  };
  return [endpoint(-1), endpoint(1)];
}

export function projectSegment(scene: ProjectionScene, segment: PhysicalSegment): PhotoPair {
  const endpoints = physicalEndpoints(scene, segment);
  return [projectCameraPoint(endpoints[0], scene.camera), projectCameraPoint(endpoints[1], scene.camera)];
}

export function pixelLength(pair: PhotoPair): number {
  return Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
}

export function shiftPair(pair: PhotoPair, offsets: readonly [Point2, Point2], roundToPixel = false): PhotoPair {
  const shifted = pair.map((point, index) => {
    const x = point.x + offsets[index]![0];
    const y = point.y + offsets[index]![1];
    return { x: roundToPixel ? Math.round(x) : x, y: roundToPixel ? Math.round(y) : y };
  });
  return [shifted[0]!, shifted[1]!];
}

const zeroOffsets: LandmarkOffsets = { reference: [[0, 0], [0, 0]], target: [[0, 0], [0, 0]] };

/** Inward reference and outward target shifts maximize their ratio in a frontal horizontal scene. */
export function adverseHorizontalOffsets(perEndpointPx: number): LandmarkOffsets {
  return {
    reference: [[perEndpointPx, 0], [-perEndpointPx, 0]],
    target: [[-perEndpointPx, 0], [perEndpointPx, 0]],
  };
}

export interface ProjectionObservation {
  scenario: PhotoProjectionScenario;
  reference: PhotoPair;
  target: PhotoPair;
  selectedReference: PhotoPair;
  selectedTarget: PhotoPair;
  maximumEndpointErrorPx: number;
  proposal: PhotoDistanceProposal;
  truthMm: number;
  biasMm: number;
  biasPercent: number;
  rangeContainsTruth: boolean;
}

export function observePhotoProjection(scenario: PhotoProjectionScenario): ProjectionObservation {
  const reference = projectSegment(scenario.scene, scenario.scene.reference);
  const target = projectSegment(scenario.scene, scenario.scene.target);
  const offsets = scenario.offsets ?? zeroOffsets;
  const selectedReference = shiftPair(reference, offsets.reference, scenario.roundToPixel);
  const selectedTarget = shiftPair(target, offsets.target, scenario.roundToPixel);
  const maximumEndpointErrorPx = Math.max(...[reference, target].flatMap((pair, pairIndex) =>
    pair.map((point, endpointIndex) => {
      const selected = [selectedReference, selectedTarget][pairIndex]![endpointIndex]!;
      return Math.hypot(selected.x - point.x, selected.y - point.y);
    })));
  const proposal = measurePhotoDistance({
    reference: selectedReference,
    target: selectedTarget,
    referenceMm: scenario.enteredReferenceMm ?? scenario.scene.reference.lengthMm,
    ...(scenario.referenceUncertaintyMm !== undefined ? { referenceUncertaintyMm: scenario.referenceUncertaintyMm } : {}),
    ...(scenario.endpointUncertaintyPx !== undefined ? { endpointUncertaintyPx: scenario.endpointUncertaintyPx } : {}),
  });
  const truthMm = scenario.scene.target.lengthMm;
  const biasMm = proposal.estimateMm - truthMm;
  return {
    scenario, reference, target, selectedReference, selectedTarget,
    maximumEndpointErrorPx, proposal, truthMm, biasMm,
    biasPercent: 100 * biasMm / truthMm,
    // Only suppress floating-point noise at exact interval boundaries.
    rangeContainsTruth: proposal.lowerMm <= truthMm + 1e-9 && proposal.upperMm >= truthMm - 1e-9,
  };
}

const camera: PinholeCamera = { focalLengthPx: 2400, imageWidthPx: 4000, imageHeightPx: 3000, distanceMm: 1000 };
const segment = (lengthMm: number, axisDeg: number, centerMm: Point2, depthOffsetMm = 0): PhysicalSegment =>
  ({ lengthMm, axisDeg, centerMm, depthOffsetMm });

export function frontalScene(): ProjectionScene {
  return {
    camera: { ...camera }, yawDeg: 0, pitchDeg: 0,
    reference: segment(100, 0, [-100, -80]),
    target: segment(150, 0, [100, 80]),
  };
}

function scenario(id: string, family: PhotoProjectionScenario['family'], description: string,
  changes: Partial<ProjectionScene> = {}, extras: Partial<PhotoProjectionScenario> = {}): PhotoProjectionScenario {
  return { id, family, description, scene: { ...frontalScene(), ...changes }, ...extras };
}

/** Fixed cases expose specific limitations; they do not sample real camera prevalence. */
export function photoProjectionScenarios(): PhotoProjectionScenario[] {
  const displayErrorInNativePx = 2 * 4000 / 560;
  const yawSweep = [0, 5, 10, 15, 20].flatMap((yawDeg) => [
    scenario(`yaw-sweep-${yawDeg}deg-high`, 'perspective',
      `Fixed placements, axes and distance; ${yawDeg} degree yaw at high focal-pixel scale.`, { yawDeg }),
    scenario(`yaw-sweep-${yawDeg}deg-low`, 'perspective',
      `Identical physical scene and ${yawDeg} degree yaw with 3x lower focal-pixel scale.`, {
        yawDeg, camera: { ...camera, focalLengthPx: 800, imageWidthPx: 1333, imageHeightPx: 1000 },
      }),
  ]);
  return [
    scenario('frontal-parallel', 'favorable', 'Frontoparallel plane; exact landmarks, parallel axes.'),
    scenario('frontal-cross-axis', 'favorable', 'Frontoparallel plane; vertical reference and horizontal target.',
      { reference: segment(100, 90, [-100, -80]) }),
    scenario('frontal-diagonal', 'favorable', 'Frontoparallel plane; diagonal target.',
      { target: segment(150, 35, [100, 80]) }),
    ...yawSweep,
    scenario('yaw30-separated', 'perspective', 'Coplanar parallel axes at different horizontal locations.', { yawDeg: 30 }),
    scenario('yaw60-separated', 'perspective', 'Stronger yaw with separated coplanar parallel axes.', { yawDeg: 60 }),
    scenario('pitch30-separated', 'perspective', 'Coplanar vertical axes at different vertical locations.', {
      pitchDeg: 30, reference: segment(100, 90, [0, -100]), target: segment(150, 90, [0, 100]),
    }),
    scenario('yaw45-cross-axis', 'perspective', 'Horizontal reference foreshortened by yaw; vertical target.', {
      yawDeg: 45, reference: segment(100, 0, [0, 0]), target: segment(150, 90, [0, 0]),
    }),
    scenario('pitch45-cross-axis', 'perspective', 'Vertical reference foreshortened by pitch; horizontal target.', {
      pitchDeg: 45, reference: segment(100, 90, [0, 0]), target: segment(150, 0, [0, 0]),
    }),
    scenario('yaw45-reverse-axes', 'perspective', 'Vertical reference; yaw-foreshortened horizontal target.', {
      yawDeg: 45, reference: segment(100, 90, [0, 0]), target: segment(150, 0, [0, 0]),
    }),
    scenario('yaw30-pitch25-diagonal', 'perspective', 'Combined yaw/pitch and different target axis.', {
      yawDeg: 30, pitchDeg: 25, target: segment(150, 40, [100, 80]),
    }),
    scenario('yaw30-near-reference', 'perspective', 'Nearby coplanar parallel axes reduce this geometry bias.', {
      yawDeg: 30, reference: segment(100, 0, [-10, -10]), target: segment(150, 0, [10, 10]),
    }),
    scenario('yaw30-near-camera', 'perspective', 'Same separated scene with a closer camera.', {
      yawDeg: 30, camera: { ...camera, distanceMm: 500 },
    }),
    scenario('yaw30-far-camera', 'perspective', 'Same separated scene with a farther camera.', {
      yawDeg: 30, camera: { ...camera, distanceMm: 2000 },
    }),
    scenario('target-100mm-nearer', 'depth', 'Frontoparallel target is 100 mm closer than reference.', {
      target: segment(150, 0, [100, 80], -100),
    }),
    scenario('target-100mm-farther', 'depth', 'Frontoparallel target is 100 mm farther than reference.', {
      target: segment(150, 0, [100, 80], 100),
    }),
    scenario('depth-near-camera', 'depth', '100 mm depth mismatch at 500 mm camera distance.', {
      camera: { ...camera, distanceMm: 500 }, target: segment(150, 0, [100, 80], -100),
    }),
    scenario('depth-far-camera', 'depth', '100 mm depth mismatch at 2000 mm camera distance.', {
      camera: { ...camera, distanceMm: 2000 }, target: segment(150, 0, [100, 80], -100),
    }),
    scenario('high-resolution-rounded', 'resolution', 'High resolution; diagonal target and nearest-pixel landmark rounding.', {
      target: segment(150, 35, [100, 80]),
    }, { roundToPixel: true }),
    scenario('low-resolution-rounded', 'resolution', 'Approximately 6x downsampled raster; same scene and nearest-pixel rounding.', {
      camera: { ...camera, focalLengthPx: 400, imageWidthPx: 667, imageHeightPx: 500 },
      target: segment(150, 35, [100, 80]),
    }, { roundToPixel: true }),
    scenario('native-2px-adversarial', 'landmarks', 'All four endpoint errors are bounded by the default 2 native pixels.', {},
      { offsets: adverseHorizontalOffsets(2) }),
    scenario('native-3px-adversarial', 'landmarks', '3 native pixels per endpoint exceed the default allowance.', {},
      { offsets: adverseHorizontalOffsets(3) }),
    scenario('native-6px-adversarial', 'landmarks', '6 native pixels per endpoint exceed the default allowance.', {},
      { offsets: adverseHorizontalOffsets(6) }),
    scenario('display-2px-native-default', 'landmarks', '4000x3000 displayed at 560x420; 2 display px is 14.2857 native px.',
      { camera: { ...camera, focalLengthPx: 4000 } },
      { offsets: adverseHorizontalOffsets(displayErrorInNativePx) }),
    scenario('display-2px-configured', 'landmarks', 'Same display error; estimator allowance converted to original-image pixels.',
      { camera: { ...camera, focalLengthPx: 4000 } },
      { offsets: adverseHorizontalOffsets(displayErrorInNativePx), endpointUncertaintyPx: displayErrorInNativePx }),
    scenario('reference-1mm-too-long', 'reference', 'Entered reference is 1 mm high; stated uncertainty is 1 mm.', {},
      { enteredReferenceMm: 101, referenceUncertaintyMm: 1 }),
    scenario('reference-10mm-too-long', 'reference', 'Entered reference is 10 mm high with no stated uncertainty.', {},
      { enteredReferenceMm: 110 }),
  ];
}

const rounded = (value: number): number => Number(value.toFixed(6));

export function photoProjectionReport() {
  return {
    methodology: {
      model: 'Deterministic ideal pinhole camera; yaw about Y, then pitch about X; no lens distortion or calibration error.',
      physicalLengths: '100 mm reference and 150 mm target; rigid rotations preserve their true 3D lengths.',
      scene: 'Segment centers are in-plane (u,v); depthOffsetMm is an additional camera-optical-axis displacement.',
      landmarks: 'Exact projected endpoints except explicitly reported offsets or nearest-pixel rounding. Errors are Euclidean image-pixel distances.',
      rangeMeaning: 'Returned selection/reference interval only. Coverage here is a case observation, not a probability or a general accuracy guarantee.',
      display: 'The display examples map a 4000x3000 original image to 560x420; 2 display pixels equals 100/7 native pixels.',
    },
    rows: photoProjectionScenarios().map((scenario) => {
      const observation = observePhotoProjection(scenario);
      const { proposal, truthMm, biasMm, biasPercent, rangeContainsTruth } = observation;
      return {
        id: scenario.id, family: scenario.family, description: scenario.description,
        yawDeg: scenario.scene.yawDeg, pitchDeg: scenario.scene.pitchDeg,
        cameraDistanceMm: scenario.scene.camera.distanceMm,
        focalLengthPx: scenario.scene.camera.focalLengthPx,
        imageSizePx: [scenario.scene.camera.imageWidthPx, scenario.scene.camera.imageHeightPx].map(rounded),
        reference: scenario.scene.reference, target: scenario.scene.target,
        enteredReferenceMm: scenario.enteredReferenceMm ?? scenario.scene.reference.lengthMm,
        referenceUncertaintyMm: scenario.referenceUncertaintyMm ?? 0,
        endpointAllowancePx: rounded(proposal.endpointUncertaintyPx),
        maximumEndpointErrorPx: rounded(observation.maximumEndpointErrorPx),
        referencePixels: rounded(proposal.referencePixels), targetPixels: rounded(proposal.targetPixels),
        truthMm, estimateMm: rounded(proposal.estimateMm), biasMm: rounded(biasMm), biasPercent: rounded(biasPercent),
        lowerMm: rounded(proposal.lowerMm), upperMm: rounded(proposal.upperMm), rangeContainsTruth,
      };
    }),
  };
}
