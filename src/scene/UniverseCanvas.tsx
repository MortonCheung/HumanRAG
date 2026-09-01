import { PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import { CameraController } from './CameraController';
import { BatchedKnowledgeEdges } from './BatchedKnowledgeEdges';
import { NodePointField } from './NodePointField';
import { NodeHitField } from './NodeHitField';
import { NeuralSignals } from './NeuralSignals';
import { ScenePresenceController, type ScenePresence } from './ScenePresenceController';
import {
  QUALITY_CONFIG,
  readRuntimeQualitySignals,
  resolveAutoQualityTier,
  resolveDpr,
} from '../performance/qualityPolicy';
import type { RuntimeQualitySignals } from '../performance/types';
import { useKnowledgeStore } from '../store/knowledgeStore';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';

function KnowledgeField({
  model,
  intent,
  onHover,
  onSelect,
  experiencePhase,
  motionAllowed,
}: {
  model: SceneModel;
  intent: CameraIntent;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  experiencePhase: SpatialExperiencePhase;
  motionAllowed: boolean;
}) {
  const graphGroup = useRef<THREE.Group>(null);
  const [presence, setPresence] = useState<ScenePresence>('intro');
  const handlePresence = useCallback((next: ScenePresence) => setPresence((current) => current === next ? current : next), []);
  const lifeActive = motionAllowed && (presence === 'intro' || presence === 'idle');

  useEffect(() => {
    if (motionAllowed || !graphGroup.current) return;
    graphGroup.current.rotation.set(0, 0, 0);
    graphGroup.current.scale.set(1, 1, 1);
    graphGroup.current.position.set(0, 0, 0);
  }, [motionAllowed]);

  return (
    <>
      <color attach="background" args={['#020303']} />
      <fog attach="fog" args={['#070a0b', 58, 168]} />
      <group ref={graphGroup}>
        <BatchedKnowledgeEdges model={model} />
        <NodePointField model={model} lifeActive={lifeActive} />
        <NodeHitField model={model} onHover={onHover} onSelect={onSelect} />
        <NeuralSignals model={model} motionAllowed={motionAllowed} />
      </group>
      {motionAllowed && <ScenePresenceController groupRef={graphGroup} activityKey={intent.id} onPresenceChange={handlePresence} />}
      <CameraController intent={intent} model={model} experiencePhase={experiencePhase} />
      <QualityBloom />
    </>
  );
}

export function KnowledgeFieldCanvas({
  model,
  intent,
  onHover,
  onSelect,
  onMissed,
  experiencePhase = 'universe',
}: {
  model: SceneModel;
  intent: CameraIntent;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onMissed: () => void;
  experiencePhase?: SpatialExperiencePhase;
}) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const qualityPreference = useKnowledgeStore((state) => state.qualityPreference);
  const setResolvedQualityTier = useKnowledgeStore((state) => state.setResolvedQualityTier);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [runtimeSignals, setRuntimeSignals] = useState<RuntimeQualitySignals>(() => readRuntimeQualitySignals());
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setRuntimeSignals(readRuntimeQualitySignals());
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);
  useEffect(() => {
    if (qualityPreference === 'auto') {
      setResolvedQualityTier(resolveAutoQualityTier(runtimeSignals));
    }
  }, [qualityPreference, runtimeSignals, setResolvedQualityTier]);
  const dpr = resolveDpr(viewport.width, viewport.height, window.devicePixelRatio || 1, QUALITY_CONFIG[quality]);
  return (
    <div className="canvas-layer spatial-canvas-layer">
      <Canvas
        dpr={dpr}
        frameloop="demand"
        gl={{ antialias: quality === 'quality', alpha: false, powerPreference: 'high-performance', stencil: false, toneMapping: THREE.ACESFilmicToneMapping }}
        onPointerMissed={onMissed}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute('role', 'img');
          gl.domElement.setAttribute('aria-label', `计算机知识关系俯视图，包含 ${model.nodes.length} 个知识节点和 ${model.edges.length} 条关系`);
        }}
      >
        <PerspectiveCamera makeDefault fov={44} near={0.1} far={320} position={[45, 33, 56]} />
        <KnowledgeField
          model={model}
          intent={intent}
          onHover={onHover}
          onSelect={onSelect}
          experiencePhase={experiencePhase}
          motionAllowed={!runtimeSignals.reducedMotion}
        />
      </Canvas>
    </div>
  );
}

function QualityBloom() {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  if (!QUALITY_CONFIG[quality].bloom) return null;
  return <EffectComposer multisampling={0} resolutionScale={0.5}><Bloom intensity={0.54} luminanceThreshold={0.84} luminanceSmoothing={0.25} mipmapBlur /></EffectComposer>;
}
