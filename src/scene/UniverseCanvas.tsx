import { PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import { CameraController } from './CameraController';
import { KnowledgeCurves } from './KnowledgeCurves';
import { KnowledgeNodeMesh } from './KnowledgeNodeMesh';
import { ScreenAnchorTracker } from './ScreenAnchorTracker';

function KnowledgeField({
  model,
  intent,
  onHover,
  onSelect,
}: {
  model: SceneModel;
  intent: CameraIntent;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const positions = useRef(new Map(model.nodes.map((node) => [node.id, new THREE.Vector3(...node.displayPosition)])));
  const selectedNodeId = useMemo(() => model.nodes.find((node) => node.visualState === 'selected')?.id ?? null, [model.nodes]);

  return (
    <>
      <color attach="background" args={['#06080b']} />
      <fog attach="fog" args={['#090d12', 68, 155]} />
      <hemisphereLight intensity={0.72} color="#d7e4ef" groundColor="#040608" />
      <directionalLight position={[24, 38, 28]} intensity={1.45} color="#dceaff" />
      <ambientLight intensity={0.22} />
      <KnowledgeCurves edges={model.edges} positions={positions} />
      {model.nodes.map((node) => (
        <KnowledgeNodeMesh key={node.id} node={node} positions={positions} onHover={onHover} onSelect={onSelect} />
      ))}
      <CameraController intent={intent} model={model} />
      <ScreenAnchorTracker selectedNodeId={selectedNodeId} positions={positions} />
    </>
  );
}

export function KnowledgeFieldCanvas({
  model,
  intent,
  onHover,
  onSelect,
  onMissed,
}: {
  model: SceneModel;
  intent: CameraIntent;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onMissed: () => void;
}) {
  return (
    <div className="canvas-layer" aria-hidden="true">
      <Canvas
        dpr={[1, 1.55]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={onMissed}
      >
        <PerspectiveCamera makeDefault fov={44} near={0.1} far={320} position={[45, 33, 56]} />
        <KnowledgeField model={model} intent={intent} onHover={onHover} onSelect={onSelect} />
      </Canvas>
    </div>
  );
}
