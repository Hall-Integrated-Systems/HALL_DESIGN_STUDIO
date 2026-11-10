import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { GLProps, RootState } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3, WebGLRenderer } from 'three';
import { toBufferGeometry } from './export.ts';
import type { Artifact } from './export.ts';
import type { RingDimensions } from './geometry.ts';
import { formatMeasurement } from './unitsAndSize.ts';
import './preview-fallback.css';

type PreviewStatus = 'checking' | 'starting' | 'ready' | 'unavailable';
type RendererFactory = Extract<GLProps, (...args: never[]) => unknown>;
type RendererOptions = Parameters<RendererFactory>[0];

/** Probe a disposable canvas so an unsupported browser never reaches the async R3F setup. */
export function probeWebGL2(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): boolean {
  try {
    const context = createCanvas().getContext('webgl2');
    if (!context) return false;
    // Release the temporary context; the preview creates its own renderer and canvas.
    try { context.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* Best effort only. */ }
    return true;
  } catch {
    return false;
  }
}

/** Keep the original error available for diagnostics while triggering the 2D path. */
export function createRendererWithFallback<T>(create: () => T, onFailure: () => void): T {
  try { return create(); }
  catch (error) { onFailure(); throw error; }
}

export function RingPreviewFallback({ parameters, onRetry }: { parameters: RingDimensions; onRetry?: () => void }) {
  const { outerDiameterMm: outer, innerDiameterMm: opening, thicknessMm: thickness } = parameters;
  const displayedOuter = formatMeasurement(outer, 'mm');
  const displayedOpening = formatMeasurement(opening, 'mm');
  const displayedThickness = formatMeasurement(thickness, 'mm');
  const margin = outer * 0.56;
  return <div className="ring-preview-fallback">
    <p className="ring-preview-fallback-message" role="status"><strong>3D preview unavailable.</strong> Showing a 2D top view. Your geometry checks and downloads are still available.</p>
    <svg viewBox={`${-margin} ${-margin} ${margin * 2} ${margin * 2}`} role="img" aria-label={`2D top view of a ring: outside diameter ${displayedOuter} mm, opening diameter ${displayedOpening} mm, thickness ${displayedThickness} mm`}>
      <circle cx="0" cy="0" r={outer / 2} className="ring-preview-fallback-outer" />
      <circle cx="0" cy="0" r={opening / 2} className="ring-preview-fallback-opening" />
    </svg>
    <p className="ring-preview-fallback-dimensions">Outside {displayedOuter} mm · Opening {displayedOpening} mm · Thickness {displayedThickness} mm</p>
    {onRetry && <button type="button" onClick={onRetry}>Retry 3D preview</button>}
  </div>;
}

class PreviewBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Camera({ artifact, top }: { artifact: Artifact; top: boolean }) {
  const { camera, invalidate } = useThree();
  const { outerDiameterMm: diameter, thicknessMm: h } = artifact.report.parameters;
  useEffect(() => {
    const distance = Math.max(diameter, h) * 1.65;
    camera.up.set(0, 0, 1);
    camera.position.set(top ? 0 : distance, top ? 0 : -distance, h / 2 + (top ? distance * 1.7 : distance));
    camera.near = Math.max(0.001, Math.min(diameter, h) / 100);
    camera.far = distance * 30;
    camera.lookAt(0, 0, h / 2);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, diameter, h, top, invalidate]);
  return <OrbitControls key={`${diameter}-${h}-${top}`} target={new Vector3(0, 0, h / 2)} makeDefault minDistance={Math.max(diameter, h) * 0.2} maxDistance={Math.max(diameter, h) * 10} />;
}

function Ring({ artifact }: { artifact: Artifact }) {
  const geometry = useMemo(() => {
    const indexed = toBufferGeometry(artifact.mesh);
    const result = indexed.toNonIndexed();
    indexed.dispose(); result.computeVertexNormals(); return result;
  }, [artifact]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#78a7d8" roughness={0.4} metalness={0.3} /></mesh>;
}

export default function Preview({ artifact }: { artifact: Artifact | null }) {
  const [top, setTop] = useState(false);
  const [graphics, setGraphics] = useState<PreviewStatus>('checking');
  const [retry, setRetry] = useState(0);
  const removeContextListener = useRef<() => void>(() => {});
  const hasArtifact = artifact !== null;

  useEffect(() => {
    if (!hasArtifact) { setGraphics('checking'); return; }
    setGraphics(probeWebGL2() ? 'starting' : 'unavailable');
  }, [hasArtifact, retry]);

  // R3F configures its renderer asynchronously, so React error boundaries do not
  // catch every initialization rejection. Do not leave a silent blank canvas.
  useEffect(() => {
    if (graphics !== 'starting' || !hasArtifact) return;
    const timer = window.setTimeout(() => setGraphics(current => current === 'starting' ? 'unavailable' : current), 8000);
    return () => window.clearTimeout(timer);
  }, [graphics, hasArtifact]);

  useEffect(() => {
    if (graphics === 'unavailable' || !hasArtifact) removeContextListener.current();
  }, [graphics, hasArtifact]);
  useEffect(() => () => removeContextListener.current(), []);

  const createRenderer = useCallback((options: RendererOptions) => createRendererWithFallback(
    () => new WebGLRenderer({ ...options, canvas: options.canvas as HTMLCanvasElement, antialias: true }),
    () => queueMicrotask(() => setGraphics(current => current === 'starting' ? 'unavailable' : current)),
  ), []);

  const onCreated = useCallback((state: RootState) => {
    removeContextListener.current();
    const canvas = state.gl.domElement;
    const onContextLost = () => setGraphics('unavailable');
    canvas.addEventListener('webglcontextlost', onContextLost);
    removeContextListener.current = () => canvas.removeEventListener('webglcontextlost', onContextLost);
    setGraphics(current => current === 'starting' ? 'ready' : current);
  }, []);

  const showFallback = !!artifact && graphics === 'unavailable';
  return <section className="preview" aria-label={showFallback ? '2D ring preview' : '3D ring preview'}>
    <div className="preview-heading"><span>{showFallback ? '2D top view' : 'Geometry preview'}</span>{!showFallback && <div className="view-buttons"><button type="button" aria-pressed={!top} onClick={() => setTop(false)}>Isometric</button><button type="button" aria-pressed={top} onClick={() => setTop(true)}>Top</button></div>}</div>
    {!artifact ? <p className="empty">Enter dimensions and generate a ring to inspect it here.</p> :
      showFallback ? <RingPreviewFallback parameters={artifact.report.parameters} onRetry={() => { setGraphics('checking'); setRetry(value => value + 1); }} /> :
      graphics === 'checking' ? <p className="empty" role="status">Checking 3D preview…</p> : <>
        <PreviewBoundary key={retry} onFailure={() => setGraphics('unavailable')}><Canvas frameloop="demand" camera={{ position: [300, -300, 300], up: [0, 0, 1], fov: 35 }} gl={createRenderer} onCreated={onCreated}>
          <color attach="background" args={['#0b0f14']} />
          <ambientLight intensity={1.3} />
          <directionalLight position={[200, -250, 400]} intensity={2.6} />
          <directionalLight position={[-200, 100, 200]} intensity={1.3} />
          <Camera artifact={artifact} top={top} /><Ring artifact={artifact} />
        </Canvas></PreviewBoundary>
        {graphics === 'starting' && <p className="ring-preview-starting" role="status">Starting 3D preview…</p>}
      </>}
    <p className="preview-caption">{!artifact ? 'A changed measurement clears the previous export.' : showFallback ? 'Top view only · dimensions are nominal, not a fit check.' : 'Drag to orbit · Scroll to zoom · Z up · Base at Z = 0 mm'}</p>
  </section>;
}
