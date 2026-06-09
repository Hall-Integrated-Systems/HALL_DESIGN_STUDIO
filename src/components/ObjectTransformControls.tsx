import { TransformControls } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { ComponentRef, useEffect, useRef } from 'react';
import type { Group } from 'three';
import { useStudioStore } from '../state/studioStore';
import type { AxisMoveLock, StudioObject, Vec3 } from '../types/studioTypes';

type TransformControlsEvents = {
  addEventListener: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener: (type: string, listener: (event: unknown) => void) => void;
};

export function ObjectTransformControls({
  object,
  target,
  setOrbitEnabled,
}: {
  object: StudioObject;
  target: Group;
  setOrbitEnabled: (enabled: boolean) => void;
}) {
  const controlsRef = useRef<ComponentRef<typeof TransformControls> | null>(null);
  const dragStartPositionRef = useRef<Vec3>(object.position);
  const mode = useStudioStore((state) => state.transformMode);
  const axisMoveLock = useStudioStore((state) => state.settings.axisMoveLock);
  const updateObjectTransform = useStudioStore((state) => state.updateObjectTransform);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const controls = controlsRef.current as TransformControlsEvents | null;
    if (!controls) return;

    const syncTransform = () => {
      const position = getLockedPosition(axisMoveLock, dragStartPositionRef.current, [target.position.x, target.position.y, target.position.z], mode);
      target.position.set(...position);
      updateObjectTransform(object.id, {
        position,
        rotation: [target.rotation.x, target.rotation.y, target.rotation.z],
        scale: [target.scale.x, target.scale.y, target.scale.z],
      });
    };

    const handleDragging = (event: { value: boolean }) => {
      if (event.value) {
        dragStartPositionRef.current = [target.position.x, target.position.y, target.position.z];
      } else {
        syncTransform();
      }
      setOrbitEnabled(!event.value);
    };

    controls.addEventListener('objectChange', syncTransform);
    controls.addEventListener('mouseUp', syncTransform);
    controls.addEventListener('dragging-changed', handleDragging as (event: unknown) => void);

    return () => {
      controls.removeEventListener('objectChange', syncTransform);
      controls.removeEventListener('mouseUp', syncTransform);
      controls.removeEventListener('dragging-changed', handleDragging as (event: unknown) => void);
    };
  }, [axisMoveLock, mode, object.id, setOrbitEnabled, target, updateObjectTransform]);

  const stopTransformPointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
  };

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      camera={camera}
      domElement={gl.domElement}
      mode={mode}
      showX={axisMoveLock === 'free' || axisMoveLock === 'x'}
      showY={axisMoveLock === 'free' || axisMoveLock === 'y'}
      showZ={axisMoveLock === 'free' || axisMoveLock === 'z'}
      onPointerDown={stopTransformPointer}
      onPointerMove={stopTransformPointer}
      onPointerUp={stopTransformPointer}
    />
  );
}

function getLockedPosition(axisMoveLock: AxisMoveLock, start: Vec3, next: Vec3, mode: string): Vec3 {
  if (mode !== 'translate' || axisMoveLock === 'free') return next;
  if (axisMoveLock === 'x') return [next[0], start[1], start[2]];
  if (axisMoveLock === 'y') return [start[0], next[1], start[2]];
  return [start[0], start[1], next[2]];
}
