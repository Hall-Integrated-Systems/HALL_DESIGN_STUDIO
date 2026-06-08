import { Grid, Html, OrbitControls, Text, useGLTF } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Mesh, MeshStandardMaterial, Object3D, Quaternion } from 'three';
import { Box3, Box3Helper, Color, DoubleSide, FrontSide, Group, TextureLoader, Vector2, Vector3 } from 'three';
import { ObjectTransformControls } from './ObjectTransformControls';
import { useStudioStore } from '../state/studioStore';
import type {
  AnnotationData,
  CameraPreset,
  MountingHelperData,
  PrimitiveKind,
  StudioAssetPart,
  StudioMaterial,
  StudioObject,
  Vec3,
} from '../types/studioTypes';
import { downloadDataUrl, getScreenshotDimensions } from '../utils/exportScreenshot';

export function StudioCanvas() {
  return (
    <section className="canvas-stage">
      <Canvas camera={{ position: [4, 3, 6], fov: 45 }} gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }} shadows>
        <StudioScene />
      </Canvas>
    </section>
  );
}

function StudioScene() {
  const objects = useStudioStore((state) => state.objects);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectObject = useStudioStore((state) => state.selectObject);
  const transformMode = useStudioStore((state) => state.transformMode);
  const setTransformMode = useStudioStore((state) => state.setTransformMode);
  const settings = useStudioStore((state) => state.settings);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  return (
    <>
      <SceneBackground />
      <CameraController />
      <HighResolutionExporter />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.6}
        castShadow={settings.shadowsEnabled}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-3, 3, -4]} intensity={0.45} />
      {settings.gridVisible && (
        <Grid
          args={[24, 24]}
          cellSize={0.5}
          cellThickness={0.55}
          sectionSize={2}
          sectionThickness={1}
          cellColor={settings.backgroundMode === 'light' ? '#c3ccd6' : '#2d3440'}
          sectionColor={settings.backgroundMode === 'light' ? '#8e9aaa' : '#566171'}
          fadeDistance={22}
          fadeStrength={1}
        />
      )}
      {settings.floorVisible && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow={settings.shadowsEnabled}>
          <planeGeometry args={[80, 80]} />
          <shadowMaterial opacity={settings.shadowsEnabled ? 0.18 : 0} />
        </mesh>
      )}

      <Suspense fallback={<LoadingLabel />}>
        {objects.map((object) => (
          <SceneObject
            key={object.id}
            object={object}
            isSelected={object.id === selectedObjectId}
            shadowsEnabled={settings.shadowsEnabled}
            setOrbitEnabled={setOrbitEnabled}
          />
        ))}
      </Suspense>

      <OrbitControls enabled={orbitEnabled} makeDefault minDistance={1.5} maxDistance={60} />

      <Html fullscreen className="mode-overlay">
        <div className="mode-selector">
          {(['translate', 'rotate', 'scale'] as const).map((mode) => (
            <button key={mode} type="button" className={mode === transformMode ? 'active' : ''} onClick={() => setTransformMode(mode)}>
              {mode}
            </button>
          ))}
        </div>
      </Html>

      <mesh position={[0, -1000, 0]} onPointerDown={() => selectObject(null)}>
        <boxGeometry args={[0.01, 0.01, 0.01]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

function SceneObject({
  object,
  isSelected,
  shadowsEnabled,
  setOrbitEnabled,
}: {
  object: StudioObject;
  isSelected: boolean;
  shadowsEnabled: boolean;
  setOrbitEnabled: (enabled: boolean) => void;
}) {
  const groupRef = useRef<Group | null>(null);
  const [transformTarget, setTransformTarget] = useState<Group | null>(null);
  const selectObject = useStudioStore((state) => state.selectObject);

  const handleGroupRef = useCallback((node: Group | null) => {
    groupRef.current = node;
    if (node) {
      node.userData.studioObjectId = object.id;
    }
    setTransformTarget(node);
  }, [object.id]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    group.position.set(...object.position);
    group.rotation.set(...object.rotation);
    group.scale.set(...object.scale);
  }, [object.position, object.rotation, object.scale]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!object.visible) return;
    selectObject(object.id);
  };

  return (
    <>
      <group ref={handleGroupRef} onPointerDown={handlePointerDown} visible={object.visible}>
        <ObjectGeometry object={object} shadowsEnabled={shadowsEnabled} />
      </group>
      {isSelected && transformTarget && object.visible && <SelectionBounds target={transformTarget} />}
      {isSelected && transformTarget && object.visible && !object.locked && (
        <ObjectTransformControls object={object} target={transformTarget} setOrbitEnabled={setOrbitEnabled} />
      )}
    </>
  );
}

function ObjectGeometry({ object, shadowsEnabled }: { object: StudioObject; shadowsEnabled: boolean }) {
  const materialProps = {
    color: object.material.color,
    roughness: object.material.roughness,
    metalness: object.material.metalness,
    opacity: object.material.opacity,
    transparent: object.material.opacity < 1,
  };

  if (object.kind === 'model' && object.modelDataUrl) {
    return <ImportedModel object={object} shadowsEnabled={shadowsEnabled} />;
  }

  if (object.kind === 'asset' && object.parts) {
    return <AssetGroup object={object} shadowsEnabled={shadowsEnabled} />;
  }

  if (object.kind === 'image' && object.imagePlane) {
    return <ImagePlane object={object} shadowsEnabled={shadowsEnabled} />;
  }

  if (object.kind === 'annotation' && object.annotation) {
    return <AnnotationObject annotation={object.annotation} />;
  }

  if (object.kind === 'mounting-helper' && object.mountingHelper) {
    return <MountingHelperObject object={object} helper={object.mountingHelper} shadowsEnabled={shadowsEnabled} />;
  }

  return (
    <mesh castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
      <PrimitiveGeometry kind={object.kind as PrimitiveKind} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

function MountingHelperObject({
  object,
  helper,
  shadowsEnabled,
}: {
  object: StudioObject;
  helper: MountingHelperData;
  shadowsEnabled: boolean;
}) {
  const color = object.material.color;
  const opacity = object.material.opacity;
  const transparent = opacity < 1;

  if (helper.kind === 'round-hole') {
    return (
      <group>
        <mesh>
          <ringGeometry args={[helper.diameter * 0.32, helper.diameter * 0.5, 64]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
        <mesh>
          <circleGeometry args={[helper.diameter * 0.12, 32]} />
          <meshBasicMaterial color="#f7f9fb" opacity={Math.min(opacity + 0.05, 1)} transparent side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (helper.kind === 'slotted-hole') {
    return (
      <group>
        <mesh>
          <planeGeometry args={[helper.slotLength, helper.slotWidth]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
        <mesh position={[-helper.slotLength / 2, 0, 0.002]}>
          <circleGeometry args={[helper.slotWidth / 2, 32]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
        <mesh position={[helper.slotLength / 2, 0, 0.002]}>
          <circleGeometry args={[helper.slotWidth / 2, 32]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  if (helper.kind === 'washer') {
    return (
      <group>
        <mesh>
          <ringGeometry args={[helper.diameter * 0.24, helper.diameter * 0.5, 64]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
        <mesh>
          <circleGeometry args={[helper.diameter * 0.18, 32]} />
          <meshBasicMaterial color="#11151c" opacity={0.78} transparent side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (helper.kind === 'rivnut') {
    return (
      <group>
        <mesh>
          <ringGeometry args={[helper.diameter * 0.28, helper.diameter * 0.5, 48]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
        <mesh>
          <ringGeometry args={[helper.diameter * 0.1, helper.diameter * 0.18, 32]} />
          <meshBasicMaterial color="#11151c" opacity={0.82} transparent side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (helper.kind === 'standoff') {
    return (
      <group>
        <mesh position={[0, helper.standoffHeight / 2, 0]} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <cylinderGeometry args={[helper.diameter / 2, helper.diameter / 2, helper.standoffHeight, 40]} />
          <meshStandardMaterial color={color} roughness={object.material.roughness} metalness={object.material.metalness} opacity={opacity} transparent={transparent} />
        </mesh>
        <mesh position={[0, helper.standoffHeight + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[helper.diameter * 0.16, helper.diameter * 0.32, 32]} />
          <meshBasicMaterial color="#11151c" opacity={0.72} transparent side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (helper.kind === 'bolt-head') {
    return (
      <group>
        <mesh castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
          <cylinderGeometry args={[helper.diameter / 2, helper.diameter / 2, 0.08, 6]} />
          <meshStandardMaterial color={color} roughness={object.material.roughness} metalness={object.material.metalness} opacity={opacity} transparent={transparent} />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[helper.diameter * 0.72, helper.diameter * 0.1]} />
          <meshBasicMaterial color="#11151c" opacity={0.7} transparent side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (helper.kind === 'centerline') {
    return (
      <group>
        <mesh>
          <planeGeometry args={[helper.slotLength, helper.slotWidth]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[helper.diameter * 0.75, helper.slotWidth]} />
          <HelperBasicMaterial color={color} opacity={opacity} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow={false} receiveShadow={false}>
      <boxGeometry args={helper.clearanceSize} />
      <meshBasicMaterial color={color} opacity={opacity} transparent side={DoubleSide} />
    </mesh>
  );
}

function HelperBasicMaterial({ color, opacity }: { color: string; opacity: number }) {
  return <meshBasicMaterial color={color} opacity={opacity} transparent={opacity < 1} side={DoubleSide} />;
}

function AnnotationObject({ annotation }: { annotation: AnnotationData }) {
  if (annotation.kind === 'text-label') return <AnnotationLabel annotation={annotation} />;
  if (annotation.kind === 'arrow-callout') return <ArrowCallout annotation={annotation} />;
  if (annotation.kind === 'dimension-line') return <DimensionLine annotation={annotation} />;
  return <MarkerDot annotation={annotation} />;
}

function AnnotationLabel({ annotation }: { annotation: AnnotationData }) {
  return (
    <BillboardGroup enabled={annotation.faceCamera}>
      {annotation.backgroundEnabled && <LabelBackground text={annotation.text} fontSize={annotation.fontSize} />}
      <Text fontSize={annotation.fontSize} color={annotation.color} anchorX="center" anchorY="middle">
        {annotation.text}
      </Text>
    </BillboardGroup>
  );
}

function ArrowCallout({ annotation }: { annotation: AnnotationData }) {
  const angle = (annotation.arrowAngle * Math.PI) / 180;
  const end: Vec3 = [Math.cos(angle) * annotation.arrowLength, Math.sin(angle) * annotation.arrowLength, 0];
  const labelPosition: Vec3 = [end[0] * 0.5, end[1] + annotation.fontSize * 1.4, 0];

  return (
    <BillboardGroup enabled={annotation.faceCamera}>
      <CylinderBetween start={[0, 0, 0]} end={end} color={annotation.color} thickness={annotation.lineThickness} />
      <ArrowHead position={end} angle={annotation.arrowAngle} color={annotation.color} size={annotation.lineThickness * 7} />
      {annotation.backgroundEnabled && <LabelBackground text={annotation.text} fontSize={annotation.fontSize} position={labelPosition} />}
      <Text position={labelPosition} fontSize={annotation.fontSize} color={annotation.color} anchorX="center" anchorY="middle">
        {annotation.text}
      </Text>
    </BillboardGroup>
  );
}

function DimensionLine({ annotation }: { annotation: AnnotationData }) {
  const start = new Vector3(...annotation.start);
  const end = new Vector3(...annotation.end);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const label = annotation.autoLength && annotation.text.trim().length === 0 ? `${length.toFixed(2)} u` : annotation.text || `${length.toFixed(2)} u`;

  return (
    <group>
      <CylinderBetween start={annotation.start} end={annotation.end} color={annotation.color} thickness={annotation.lineThickness} />
      <mesh position={annotation.start}>
        <sphereGeometry args={[annotation.lineThickness * 2.2, 16, 12]} />
        <meshBasicMaterial color={annotation.color} />
      </mesh>
      <mesh position={annotation.end}>
        <sphereGeometry args={[annotation.lineThickness * 2.2, 16, 12]} />
        <meshBasicMaterial color={annotation.color} />
      </mesh>
      <Text position={[mid.x, mid.y + annotation.fontSize * 1.25, mid.z]} fontSize={annotation.fontSize} color={annotation.color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

function MarkerDot({ annotation }: { annotation: AnnotationData }) {
  return (
    <mesh>
      <sphereGeometry args={[annotation.fontSize, 32, 16]} />
      <meshBasicMaterial color={annotation.color} />
    </mesh>
  );
}

function LabelBackground({ text, fontSize, position = [0, 0, -0.01] as Vec3 }: { text: string; fontSize: number; position?: Vec3 }) {
  const width = Math.max(text.length * fontSize * 0.62, fontSize * 2.2);
  const height = fontSize * 1.75;

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#0b0f14" opacity={0.72} transparent side={DoubleSide} />
    </mesh>
  );
}

function BillboardGroup({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const groupRef = useRef<Group | null>(null);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    if (enabled && groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function CylinderBetween({ start, end, color, thickness }: { start: Vec3; end: Vec3; color: string; thickness: number }) {
  const transform = useMemo(() => {
    const startVector = new Vector3(...start);
    const endVector = new Vector3(...end);
    const direction = endVector.clone().sub(startVector);
    const length = Math.max(direction.length(), 0.0001);
    const midpoint = startVector.clone().add(endVector).multiplyScalar(0.5);
    const quaternion = new Group().quaternion;
    quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    return { length, midpoint, quaternion: quaternion.clone() as Quaternion };
  }, [end, start]);

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion}>
      <cylinderGeometry args={[thickness, thickness, transform.length, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function ArrowHead({ position, angle, color, size }: { position: Vec3; angle: number; color: string; size: number }) {
  return (
    <mesh position={position} rotation={[0, 0, (angle * Math.PI) / 180 - Math.PI / 2]}>
      <coneGeometry args={[size, size * 2.2, 24]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function ImagePlane({ object, shadowsEnabled }: { object: StudioObject; shadowsEnabled: boolean }) {
  const imagePlane = object.imagePlane;

  if (!imagePlane) return null;
  if (imagePlane.imageDataUrl) {
    return <TexturedImagePlane imagePlane={imagePlane} shadowsEnabled={shadowsEnabled} />;
  }

  return (
    <mesh castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={imagePlane.tintColor}
        opacity={imagePlane.opacity}
        transparent={imagePlane.opacity < 1}
        side={imagePlane.doubleSided ? DoubleSide : FrontSide}
      />
    </mesh>
  );
}

function TexturedImagePlane({ imagePlane, shadowsEnabled }: { imagePlane: NonNullable<StudioObject['imagePlane']>; shadowsEnabled: boolean }) {
  const texture = useLoader(TextureLoader, imagePlane.imageDataUrl!);

  return (
    <mesh castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        color={imagePlane.tintColor}
        opacity={imagePlane.opacity}
        transparent
        side={imagePlane.doubleSided ? DoubleSide : FrontSide}
        alphaTest={0.02}
      />
    </mesh>
  );
}

function AssetGroup({ object, shadowsEnabled }: { object: StudioObject; shadowsEnabled: boolean }) {
  return (
    <>
      {object.parts?.map((part) => (
        <AssetPart key={part.id} part={part} parentMaterial={object.material} shadowsEnabled={shadowsEnabled} />
      ))}
    </>
  );
}

function AssetPart({
  part,
  parentMaterial,
  shadowsEnabled,
}: {
  part: StudioAssetPart;
  parentMaterial: StudioMaterial;
  shadowsEnabled: boolean;
}) {
  const material = { ...parentMaterial, ...part.material };

  return (
    <mesh position={part.position} rotation={part.rotation} scale={part.scale} castShadow={shadowsEnabled} receiveShadow={shadowsEnabled}>
      <PrimitiveGeometry kind={part.kind} />
      <meshStandardMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={material.metalness}
        opacity={material.opacity}
        transparent={material.opacity < 1}
      />
    </mesh>
  );
}

function PrimitiveGeometry({ kind }: { kind: PrimitiveKind }) {
  if (kind === 'cube') return <boxGeometry args={[1, 1, 1]} />;
  if (kind === 'cylinder') return <cylinderGeometry args={[0.5, 0.5, 1, 48]} />;
  if (kind === 'sphere') return <sphereGeometry args={[0.55, 48, 32]} />;
  return <planeGeometry args={[1, 1]} />;
}

function ImportedModel({ object, shadowsEnabled }: { object: StudioObject; shadowsEnabled: boolean }) {
  const gltf = useGLTF(object.modelDataUrl!);
  const updateObject = useStudioStore((state) => state.updateObject);
  const scene = useMemo(() => normalizeImportedScene(gltf.scene), [gltf.scene]);
  const modelName = useMemo(() => findModelName(gltf.scene), [gltf.scene]);

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh & { material?: MeshStandardMaterial | MeshStandardMaterial[] };
      if (!mesh.material) return;

      mesh.castShadow = shadowsEnabled;
      mesh.receiveShadow = shadowsEnabled;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if ('color' in material) material.color = new Color(object.material.color);
        if ('roughness' in material) material.roughness = object.material.roughness;
        if ('metalness' in material) material.metalness = object.material.metalness;
        material.opacity = object.material.opacity;
        material.transparent = object.material.opacity < 1;
        material.needsUpdate = true;
      });
    });
  }, [scene, object.material.color, object.material.metalness, object.material.opacity, object.material.roughness, shadowsEnabled]);

  useEffect(() => {
    const fallbackName = object.fileName?.replace(/\.(glb|gltf)$/i, '') || 'Imported Model';
    if (modelName && object.name === fallbackName) {
      updateObject(object.id, { name: modelName });
    }
  }, [modelName, object.fileName, object.id, object.name, updateObject]);

  return <primitive object={scene} />;
}

function SelectionBounds({ target }: { target: Object3D }) {
  const helper = useMemo(() => new Box3Helper(new Box3(), new Color('#79b8ff')), []);

  useEffect(() => {
    helper.box.setFromObject(target);
  }, [helper, target]);

  useFrame(() => {
    helper.box.setFromObject(target);
  });

  return <primitive object={helper} />;
}

function SceneBackground() {
  const backgroundMode = useStudioStore((state) => state.settings.backgroundMode);
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    if (backgroundMode === 'transparent') {
      scene.background = null;
      gl.setClearColor(0x000000, 0);
      return;
    }

    const color = backgroundMode === 'light' ? '#f4f6f8' : '#11151c';
    scene.background = new Color(color);
    gl.setClearColor(color, 1);
  }, [backgroundMode, gl, scene]);

  return null;
}

function CameraController() {
  const resetToken = useStudioStore((state) => state.cameraResetToken);
  const cameraPreset = useStudioStore((state) => state.cameraPreset);
  const cameraDistance = useStudioStore((state) => state.cameraDistance);
  const frameRequest = useStudioStore((state) => state.frameRequest);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const controls = useThree((state) => state.controls) as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | undefined;

  useEffect(() => {
    const target = new Vector3(0, 0.5, 0);
    camera.position.copy(getCameraPosition(cameraPreset, cameraDistance));
    camera.lookAt(0, 0.5, 0);
    controls?.target?.set(target.x, target.y, target.z);
    controls?.update?.();
  }, [camera, cameraDistance, cameraPreset, controls, resetToken]);

  useEffect(() => {
    if (!frameRequest) return;

    const bounds = getFrameBounds(scene, frameRequest.target === 'selected' ? selectedObjectId : null);
    if (!bounds) return;

    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const radius = Math.max(size.length() * 0.5, 0.75);
    const direction = camera.position.clone().sub(center);

    if (direction.lengthSq() === 0) {
      direction.set(1, 0.75, 1);
    }

    direction.normalize();
    const distance = Math.max(radius * 2.8, cameraDistance);
    camera.position.copy(center.clone().add(direction.multiplyScalar(distance)));
    camera.lookAt(center);
    controls?.target?.set(center.x, center.y, center.z);
    controls?.update?.();
  }, [camera, cameraDistance, controls, frameRequest, scene, selectedObjectId]);

  return null;
}

function HighResolutionExporter() {
  const exportRequestToken = useStudioStore((state) => state.exportRequestToken);
  const settings = useStudioStore((state) => state.settings);
  const selectedObjectId = useStudioStore((state) => state.selectedObjectId);
  const selectedObject = useStudioStore((state) => state.objects.find((object) => object.id === selectedObjectId));
  const pushToast = useStudioStore((state) => state.pushToast);
  const completeExportScreenshot = useStudioStore((state) => state.completeExportScreenshot);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const lastProcessedExportToken = useRef(0);

  useEffect(() => {
    if (exportRequestToken === 0) return;
    if (lastProcessedExportToken.current === exportRequestToken) return;
    lastProcessedExportToken.current = exportRequestToken;

    const canvas = gl.domElement;
    const target = getScreenshotDimensions(settings.screenshotSize, canvas);
    const previousSize = gl.getSize(new Vector2());
    const previousPixelRatio = gl.getPixelRatio();
    const previousAspect = 'aspect' in camera && typeof camera.aspect === 'number' ? camera.aspect : null;
    const fileName = settings.exportFileNameEdited ? settings.exportFileName : selectedObject?.name || 'hall-product-studio-render';

    try {
      gl.setPixelRatio(1);
      gl.setSize(target.width, target.height, false);

      if (previousAspect !== null && 'aspect' in camera) {
        camera.aspect = target.width / target.height;
        camera.updateProjectionMatrix();
      }

      gl.render(scene, camera);
      downloadDataUrl(canvas.toDataURL('image/png'), fileName);
      pushToast(`Exported ${target.width} x ${target.height} PNG.`, 'success');
    } catch {
      pushToast('PNG export failed. Try a smaller export size or reduce scene complexity.', 'error');
    } finally {
      gl.setSize(previousSize.x, previousSize.y, false);
      gl.setPixelRatio(previousPixelRatio);

      if (previousAspect !== null && 'aspect' in camera) {
        camera.aspect = previousAspect;
        camera.updateProjectionMatrix();
      }

      gl.render(scene, camera);
      completeExportScreenshot();
    }
  }, [
    camera,
    completeExportScreenshot,
    exportRequestToken,
    gl,
    pushToast,
    scene,
    selectedObject?.name,
    settings.exportFileName,
    settings.exportFileNameEdited,
    settings.screenshotSize,
  ]);

  return null;
}

function LoadingLabel() {
  return (
    <Html center>
      <div className="loading-label">Loading model...</div>
    </Html>
  );
}

function getCameraPosition(preset: CameraPreset, distance: number) {
  const positions: Record<CameraPreset, Vector3> = {
    front: new Vector3(0, 2, distance),
    back: new Vector3(0, 2, -distance),
    left: new Vector3(-distance, 2, 0),
    right: new Vector3(distance, 2, 0),
    top: new Vector3(0, distance + 1, 0.001),
    isometric: new Vector3(4, 3, 6),
  };
  return positions[preset];
}

function getFrameBounds(scene: Object3D, selectedObjectId: string | null) {
  const bounds = new Box3();
  let hasBounds = false;

  scene.traverse((child) => {
    if (!(child instanceof Group)) return;
    const objectId = child.userData.studioObjectId as string | undefined;
    if (!objectId || !child.visible) return;
    if (selectedObjectId && objectId !== selectedObjectId) return;

    const childBounds = new Box3().setFromObject(child);
    if (childBounds.isEmpty()) return;

    bounds.union(childBounds);
    hasBounds = true;
  });

  return hasBounds ? bounds : null;
}

function normalizeImportedScene(source: Object3D) {
  const clone = source.clone(true);
  const bounds = new Box3().setFromObject(clone);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const normalized = new Group();

  clone.position.sub(center);
  normalized.add(clone);

  if (Number.isFinite(maxDimension) && maxDimension > 0) {
    normalized.scale.setScalar(1.8 / maxDimension);
  }

  return normalized;
}

function findModelName(source: Object3D) {
  const ignored = new Set(['Scene', 'RootNode']);
  let found = '';

  source.traverse((child) => {
    if (!found && child.name && !ignored.has(child.name)) {
      found = child.name;
    }
  });

  return found;
}
