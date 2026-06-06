import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { ComponentRef, useEffect, useRef } from 'react';
import type { Group } from 'three';
import { useStudioStore } from '../state/studioStore';
import type { StudioObject } from '../types/studioTypes';

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
  const mode = useStudioStore((state) => state.transformMode);
  const updateObjectTransform = useStudioStore((state) => state.updateObjectTransform);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const controls = controlsRef.current as TransformControlsEvents | null;
    if (!controls) return;

    const syncTransform = () => {
      updateObjectTransform(object.id, {
        position: [target.position.x, target.position.y, target.position.z],
        rotation: [target.rotation.x, target.rotation.y, target.rotation.z],
        scale: [target.scale.x, target.scale.y, target.scale.z],
      });
    };

    const handleDragging = (event: { value: boolean }) => setOrbitEnabled(!event.value);

    controls.addEventListener('objectChange', syncTransform);
    controls.addEventListener('mouseUp', syncTransform);
    controls.addEventListener('dragging-changed', handleDragging as (event: unknown) => void);

    return () => {
      controls.removeEventListener('objectChange', syncTransform);
      controls.removeEventListener('mouseUp', syncTransform);
      controls.removeEventListener('dragging-changed', handleDragging as (event: unknown) => void);
    };
  }, [object.id, setOrbitEnabled, target, updateObjectTransform]);

  return <TransformControls ref={controlsRef} object={target} camera={camera} domElement={gl.domElement} mode={mode} />;
}
