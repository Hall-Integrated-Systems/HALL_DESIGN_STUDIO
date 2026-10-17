import { Component, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { toBufferGeometry } from './export.ts';
import type { Artifact } from './export.ts';

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="empty">3D preview unavailable. Geometry checks and STL downloads remain available.</p> : this.props.children; }
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
  return <section className="preview" aria-label="3D ring preview">
    <div className="preview-heading"><span>Geometry preview</span><div className="view-buttons"><button type="button" aria-pressed={!top} onClick={() => setTop(false)}>Isometric</button><button type="button" aria-pressed={top} onClick={() => setTop(true)}>Top</button></div></div>
    {artifact ? <PreviewBoundary><Canvas frameloop="demand" camera={{ position: [300, -300, 300], up: [0, 0, 1], fov: 35 }} gl={{ antialias: true }}>
      <color attach="background" args={['#0b0f14']} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[200, -250, 400]} intensity={2.6} />
      <directionalLight position={[-200, 100, 200]} intensity={1.3} />
      <Camera artifact={artifact} top={top} /><Ring artifact={artifact} />
    </Canvas></PreviewBoundary> : <p className="empty">Enter dimensions and generate a ring to inspect it here.</p>}
    <p className="preview-caption">{artifact ? 'Drag to orbit · Scroll to zoom · Z up · Base at Z = 0 mm' : 'A changed measurement clears the previous export.'}</p>
  </section>;
}
