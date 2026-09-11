import { Html, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import { CameraController, type CameraLifecycle } from './CameraController';
import { BatchedKnowledgeEdges } from './BatchedKnowledgeEdges';
import { NodePointField } from './NodePointField';
import { NodeHitField } from './NodeHitField';
import { QUALITY_CONFIG, readRuntimeQualitySignals, resolveAutoQualityTier, resolveDpr } from '../performance/qualityPolicy';
import type { RuntimeQualitySignals } from '../performance/types';
import { useKnowledgeStore } from '../store/knowledgeStore';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';

function ContextHealth({ onError }: { onError: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onError(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onError]);
  return null;
}

/** Report readiness after real rendered frames, including material compilation. */
function SceneReadiness({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const { invalidate } = useThree();
  useFrame(() => {
    if (frames.current >= 2) return;
    frames.current += 1;
    if (frames.current === 2) queueMicrotask(onReady);
    else invalidate();
  });
  return null;
}

export function KnowledgeFieldCanvas({ model, intent, onHover, onSelect, onMissed, experiencePhase = 'universe',
  onReady, onError, onEntryComplete, skipVersion,
}: CameraLifecycle & {
  model: SceneModel; intent: CameraIntent; onHover: (id: string | null) => void;
  onSelect: (id: string) => void; onMissed: () => void;
  experiencePhase?: SpatialExperiencePhase; onError: () => void;
}) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const qualityPreference = useKnowledgeStore((state) => state.qualityPreference);
  const activePanel = useKnowledgeStore((state) => state.activePanel);
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
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => {
    // A hidden tab already stops rendering. Rebuilding postprocessing on visibility causes a flash.
    if (qualityPreference === 'auto') setResolvedQualityTier(resolveAutoQualityTier({ ...runtimeSignals, hidden: false }));
  }, [qualityPreference, runtimeSignals, setResolvedQualityTier]);
  const dpr = resolveDpr(viewport.width, viewport.height, window.devicePixelRatio || 1, QUALITY_CONFIG[quality]);
  const motionAllowed = !runtimeSignals.reducedMotion;
  const anchors = model.nodes.filter((node) => node.type === 'goal' || node.visualState === 'selected');
  return (
    <div className="canvas-layer spatial-canvas-layer">
      <Canvas dpr={dpr} frameloop="demand"
        fallback={<div className="scene-recovery"><p>此设备暂不支持三维显示</p><a href="/library">打开知识库</a></div>}
        gl={{ antialias: quality === 'quality', alpha: false, powerPreference: 'high-performance', stencil: false, toneMapping: THREE.ACESFilmicToneMapping }}
        onPointerMissed={onMissed}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute('role', 'img');
          gl.domElement.setAttribute('aria-label', `计算机知识关系图，包含 ${model.nodes.length} 个知识节点和 ${model.edges.length} 条关系`);
        }}>
        <color attach="background" args={['#080a10']} />
        <PerspectiveCamera makeDefault fov={44} near={0.1} far={420} position={[45, 33, 56]} />
        <BatchedKnowledgeEdges model={model} experiencePhase={experiencePhase} motionAllowed={motionAllowed && !runtimeSignals.hidden} />
        <NodePointField model={model} motionAllowed={motionAllowed} experiencePhase={experiencePhase} />
        <NodeHitField model={model} onHover={onHover} onSelect={onSelect} enabled={experiencePhase === 'universe' && !activePanel} />
        {anchors.map((node) => <group key={node.id} position={node.displayPosition}>
          <Html position={[0, node.type === 'goal' ? 2.8 : 1.65, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none', visibility: experiencePhase === 'universe' ? 'visible' : 'hidden' }}><span className={`node-label ${node.visualState === 'selected' ? 'node-label--selected' : 'node-label--branch'}`}>{node.name}</span></Html>
        </group>)}
        <CameraController intent={intent} model={model} experiencePhase={experiencePhase} motionAllowed={motionAllowed}
          onEntryComplete={onEntryComplete} skipVersion={skipVersion} />
        <ContextHealth onError={onError} />
        <SceneReadiness onReady={onReady} />
        {QUALITY_CONFIG[quality].bloom && <EffectComposer multisampling={0} resolutionScale={0.5}><Bloom intensity={0.3} luminanceThreshold={1.1} luminanceSmoothing={0.18} mipmapBlur /></EffectComposer>}
      </Canvas>
    </div>
  );
}
