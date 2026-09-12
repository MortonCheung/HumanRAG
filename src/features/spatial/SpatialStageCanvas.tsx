import { Html, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../../graph/types';
import { QUALITY_CONFIG, readRuntimeQualitySignals, resolveAutoQualityTier, resolveDpr } from '../../performance/qualityPolicy';
import type { RuntimeQualitySignals } from '../../performance/types';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { BatchedKnowledgeEdges } from '../../scene/BatchedKnowledgeEdges';
import { CameraController, type CameraLifecycle } from '../../scene/CameraController';
import { NodeHitField } from '../../scene/NodeHitField';
import { NodePointField } from '../../scene/NodePointField';
import type { SpatialExperiencePhase } from './SpatialExperienceContext';
import { useSpatialStageStore } from './spatialStageStore';
import { SpatialTreeScene } from './SpatialTreeScene';
import { buildConstellationScene, CONSTELLATION_PRESETS, withAwakeningDelays } from '../../scene/intro/constellationPresets';
import { buildGoalTreeExtractionLayout, GoalTreeExtraction } from './transitions/GoalTreeExtraction';
import { useGoalTreeTransitionStore } from './transitions/goalTreeTransitionStore';

function ContextHealth({ onError }: { onError: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onError(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onError]);
  return null;
}

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

function StageA11y({ model }: { model: SceneModel }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.setAttribute('role', 'img');
    gl.domElement.setAttribute('aria-label', `计算机知识关系图，包含 ${model.nodes.length} 个知识节点和 ${model.edges.length} 条关系`);
  }, [gl, model.edges.length, model.nodes.length]);
  return null;
}

export function SpatialStageCanvas({ model, intent, onHover, onSelect, onMissed, experiencePhase, onReady, onError, onEntryComplete }: CameraLifecycle & {
  model: SceneModel;
  intent: CameraIntent;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onMissed: () => void;
  experiencePhase: SpatialExperiencePhase;
  onError: () => void;
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
    return () => { media.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => {
    if (qualityPreference === 'auto') setResolvedQualityTier(resolveAutoQualityTier({ ...runtimeSignals, hidden: false }));
  }, [qualityPreference, runtimeSignals, setResolvedQualityTier]);
  const dpr = resolveDpr(viewport.width, viewport.height, window.devicePixelRatio || 1, QUALITY_CONFIG[quality]);
  return (
    <div className="canvas-layer spatial-canvas-layer" data-spatial-stage>
      <Canvas dpr={dpr} frameloop="demand"
        fallback={<div className="scene-recovery"><p>此设备暂不支持三维显示</p><a href="/library">打开知识库</a></div>}
        gl={{ antialias: quality === 'quality', alpha: false, powerPreference: 'high-performance', stencil: false, toneMapping: THREE.ACESFilmicToneMapping }}
        onPointerMissed={onMissed}
        onCreated={({ gl }) => { gl.domElement.setAttribute('role', 'img'); }}>
        <color attach="background" args={['#080a10']} />
        <PerspectiveCamera makeDefault fov={44} near={0.1} far={420} position={[45, 33, 56]} />
        <SpatialSceneRouter model={model} intent={intent} onHover={onHover} onSelect={onSelect}
          experiencePhase={experiencePhase} onEntryComplete={onEntryComplete} motionAllowed={!runtimeSignals.reducedMotion && !runtimeSignals.hidden} />
        <ContextHealth onError={onError} />
        <StageA11y model={model} />
        <SceneReadiness onReady={onReady} />
        {QUALITY_CONFIG[quality].bloom && <EffectComposer multisampling={0} resolutionScale={0.5}><Bloom intensity={0.3} luminanceThreshold={1.1} luminanceSmoothing={0.18} mipmapBlur /></EffectComposer>}
      </Canvas>
    </div>
  );
}

function SpatialSceneRouter({ model, intent, onHover, onSelect, experiencePhase, onEntryComplete, motionAllowed }: {
  model: SceneModel;
  intent: CameraIntent;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  experiencePhase: SpatialExperiencePhase;
  onEntryComplete: () => void;
  motionAllowed: boolean;
}) {
  const mode = useSpatialStageStore((state) => state.mode);
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const extractionPhase = useGoalTreeTransitionStore((state) => state.phase);
  const extractionStartedAt = useGoalTreeTransitionStore((state) => state.phaseStartedAt);
  const extractionDraft = useGoalTreeTransitionStore((state) => state.draft);
  const preset = useRef(CONSTELLATION_PRESETS[Math.floor(Math.random() * CONSTELLATION_PRESETS.length)]).current;
  const introModel = useMemo(() => buildConstellationScene(model, preset, 'direction-408'), [model, preset]);
  const awakeningModel = useMemo(() => withAwakeningDelays(model, introModel.nodes.map((node) => node.id)), [introModel.nodes, model]);
  const openingOrigins = useMemo(() => new Map(introModel.nodes.map((node) => [node.id, node.displayPosition])), [introModel.nodes]);
  const extractionLayout = useMemo(() => extractionDraft ? buildGoalTreeExtractionLayout(extractionDraft) : null, [extractionDraft]);
  const extracting = Boolean(extractionDraft && extractionPhase !== 'idle' && extractionPhase !== 'handoff');
  const extractionActive = Boolean(extractionDraft && extractionPhase !== 'idle');
  const extractionSelectedIds = useMemo(() => new Set(extractionDraft?.pointIds ?? []), [extractionDraft]);
  const extractionState = useMemo(() => extractionDraft && extractionLayout ? {
    phase: extractionPhase,
    phaseStartedAt: extractionStartedAt,
    selectedIds: extractionSelectedIds,
    targetPositions: extractionLayout.worldPositions,
  } : undefined, [extractionDraft, extractionLayout, extractionPhase, extractionSelectedIds, extractionStartedAt]);
  if (mode === 'library' || mode === 'tree') return <SpatialTreeScene mode={mode} motionAllowed={motionAllowed} />;
  const visibleModel = experiencePhase === 'intro' ? introModel : experiencePhase === 'awakening' || experiencePhase === 'settling' ? awakeningModel : model;
  const anchors = visibleModel.nodes.filter((node) => node.type === 'goal' || node.visualState === 'selected');
  return <>
    {(!extractionActive || extractionPhase === 'highlighting' || extractionPhase === 'detaching') && <BatchedKnowledgeEdges
      model={visibleModel} experiencePhase={experiencePhase} motionAllowed={motionAllowed}
      extraction={extracting ? { phase: extractionPhase, phaseStartedAt: extractionStartedAt } : undefined} />}
    <NodePointField model={visibleModel} motionAllowed={motionAllowed} experiencePhase={experiencePhase} openingOrigins={openingOrigins} extraction={extractionState} />
    <NodeHitField model={visibleModel} onHover={onHover} onSelect={onSelect} enabled={experiencePhase === 'universe' && !activePanel && !extractionActive} />
    {!extractionActive && anchors.map((node) => <group key={node.id} position={node.displayPosition}>
      <Html position={[0, node.type === 'goal' ? 2.8 : 1.65, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none', visibility: experiencePhase === 'universe' ? 'visible' : 'hidden' }}><span className={`node-label ${node.visualState === 'selected' ? 'node-label--selected' : 'node-label--branch'}`}>{node.name}</span></Html>
    </group>)}
    {extractionActive && extractionLayout && <GoalTreeExtraction model={visibleModel} layout={extractionLayout} motionAllowed={motionAllowed} />}
    {!extractionActive && <CameraController intent={intent} model={visibleModel} experiencePhase={experiencePhase} motionAllowed={motionAllowed} onEntryComplete={onEntryComplete} />}
  </>;
}
