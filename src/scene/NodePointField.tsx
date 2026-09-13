import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneModel } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';
import { extractionProgress, type ExtractionPhase } from '../features/spatial/transitions/goalTreeTransitionStore';
import { LEARNING_STATE_COLORS, neuronAppearance, neuronFragmentShader, neuronVertexShader } from './neuronAppearance';
import type { LearningState } from '../domain/learning/deriveLearningState';

export interface NodeExtractionState {
  phase: ExtractionPhase;
  phaseStartedAt: number;
  selectedIds: ReadonlySet<string>;
  targetPositions: ReadonlyMap<string, [number, number, number]>;
}

function pointGeometry(count: number) {
  const geometry = new THREE.BufferGeometry();
  for (const [name, itemSize] of [['position', 3], ['color', 3], ['aSize', 1], ['aStrength', 1]] as const) {
    geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count * itemSize), itemSize).setUsage(THREE.DynamicDrawUsage));
  }
  return geometry;
}

/** One real node, one emissive point. Its halo never needs lighting or postprocessing. */
export function NodePointField({ model, experiencePhase, motionAllowed, openingOrigins, extraction }: {
  model: SceneModel;
  experiencePhase: SpatialExperiencePhase;
  motionAllowed: boolean;
  openingOrigins?: ReadonlyMap<string, [number, number, number]>;
  extraction?: NodeExtractionState;
}) {
  const hoveredNodeId = useKnowledgeStore((state) => state.hoveredNodeId);
  const { invalidate, viewport } = useThree();
  const geometry = useMemo(() => pointGeometry(model.nodes.length), [model.nodes.length]);
  const targets = useRef<Array<{ size: number; strength: number }>>([]);
  const positionTargets = useRef<Array<[number, number, number]>>([]);
  const canonicalPositions = useRef<Array<[number, number, number]>>([]);
  const revealTime = useRef(10);
  const settling = useRef(false);
  const uniforms = useMemo(() => ({ uDpr: { value: viewport.dpr } }), [viewport.dpr]);

  useLayoutEffect(() => {
    const positions = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color');
    const color = new THREE.Color();
    const white = new THREE.Color('#c8edff');
    const learningColor = new THREE.Color();
    model.nodes.forEach((node, index) => {
      const origin = experiencePhase === 'awakening' ? openingOrigins?.get(node.id) : undefined;
      positions.setXYZ(index, ...(origin ?? node.displayPosition));
      positionTargets.current[index] = node.displayPosition;
      canonicalPositions.current[index] = node.displayPosition;
      color.set(node.domainColor);
      if (node.learningState !== 'unknown') color.lerp(learningColor.set(LEARNING_STATE_COLORS[node.learningState]), 0.44);
      color.lerp(white, extraction?.selectedIds.has(node.id) ? 0.35 : extraction ? 0.82 : 0.62);
      colors.setXYZ(index, color.r, color.g, color.b);
    });
    positions.needsUpdate = colors.needsUpdate = true;
    invalidate();
    positionTargets.current.length = model.nodes.length;
  }, [geometry, model.nodes, openingOrigins, experiencePhase, extraction?.selectedIds, invalidate]);

  useLayoutEffect(() => {
    const sizes = geometry.getAttribute('aSize');
    const strengths = geometry.getAttribute('aStrength');
    model.nodes.forEach((node, index) => {
      const appearance = neuronAppearance(node.type, node.visualState, node.id === hoveredNodeId, node.learningState);
      if (experiencePhase === 'intro') appearance.strength = Math.max(0.9, appearance.strength);
      targets.current[index] = appearance;
      if (experiencePhase === 'awakening') {
        const revealed = node.propagationDelay === 0 ? 1 : 0;
        sizes.setX(index, appearance.size * (.68 + .32 * revealed));
        strengths.setX(index, appearance.strength * revealed);
      } else if (experiencePhase !== 'settling' && (!motionAllowed || sizes.getX(index) === 0)) {
        sizes.setX(index, appearance.size);
        strengths.setX(index, appearance.strength);
      }
    });
    targets.current.length = model.nodes.length;
    [sizes, strengths].forEach((attribute) => { attribute.needsUpdate = true; });
    if (experiencePhase === 'awakening') revealTime.current = 0;
    else if (experiencePhase === 'intro' || experiencePhase === 'universe') revealTime.current = 10;
    settling.current = motionAllowed || Boolean(extraction);
    invalidate();
  }, [geometry, model.nodes, hoveredNodeId, experiencePhase, motionAllowed, extraction, invalidate]);

  useFrame((_, delta) => {
    if (!settling.current) return;
    const positions = geometry.getAttribute('position');
    const sizes = geometry.getAttribute('aSize');
    const strengths = geometry.getAttribute('aStrength');
    const alpha = motionAllowed ? 1 - Math.exp(-Math.min(delta, 0.05) * 14) : 1;
    const opening = experiencePhase === 'awakening' || experiencePhase === 'settling';
    if (opening) revealTime.current += Math.min(delta, .05);
    let remaining = 0;
    targets.current.forEach((target, index) => {
      const delay = model.nodes[index]?.propagationDelay ?? 0;
      const reveal = opening ? THREE.MathUtils.smoothstep(revealTime.current, delay, delay + .16) : 1;
      const extractionPhase = extraction?.phase;
      const selected = Boolean(extraction?.selectedIds.has(model.nodes[index]?.id));
      const phaseProgress = extractionPhase ? extractionProgress(extractionPhase, extraction.phaseStartedAt, motionAllowed) : 0;
      const highlighted = extractionPhase
        ? extractionPhase === 'highlighting' ? phaseProgress : extractionPhase === 'idle' ? 0 : 1
        : 0;
      const receded = extractionPhase
        ? extractionPhase === 'receding' ? phaseProgress : ['forming', 'connecting', 'ready', 'handoff'].includes(extractionPhase) ? 1 : 0
        : 0;
      const formed = extractionPhase
        ? extractionPhase === 'forming' ? phaseProgress : ['connecting', 'ready', 'handoff'].includes(extractionPhase) ? 1 : 0
        : 0;
      const relevanceStrength = extraction ? selected ? 1 + highlighted * 0.38 : 1 - receded : 1;
      const relevanceSize = extraction ? selected ? 1 + highlighted * 0.12 : 1 - receded * 0.32 : 1;
      const desiredSize = target.size * (.68 + .32 * reveal) * relevanceSize;
      const desiredStrength = target.strength * reveal * relevanceStrength;
      const sizeDelta = desiredSize - sizes.getX(index);
      const strengthDelta = desiredStrength - strengths.getX(index);
      sizes.setX(index, sizes.getX(index) + sizeDelta * alpha);
      strengths.setX(index, strengths.getX(index) + strengthDelta * alpha);
      const canonical = canonicalPositions.current[index];
      const extractionTarget = selected ? extraction?.targetPositions.get(model.nodes[index]?.id) : undefined;
      const targetPosition = extraction && canonical
        ? selected && extractionTarget
          ? [
              THREE.MathUtils.lerp(canonical[0], extractionTarget[0], formed),
              THREE.MathUtils.lerp(canonical[1], extractionTarget[1], formed),
              THREE.MathUtils.lerp(canonical[2], extractionTarget[2], formed),
            ] as [number, number, number]
          : [canonical[0], canonical[1], canonical[2] - 18 * receded] as [number, number, number]
        : positionTargets.current[index];
      if (targetPosition) {
        // Forming already owns a smooth, phase-based interpolation. Applying a second
        // spring here makes the camera and new edges arrive before their endpoint nodes.
        const positionAlpha = extraction && selected
          ? 1
          : motionAllowed ? 1 - Math.exp(-Math.min(delta, .05) * 3.5) : 1;
        positions.setXYZ(
          index,
          positions.getX(index) + (targetPosition[0] - positions.getX(index)) * positionAlpha,
          positions.getY(index) + (targetPosition[1] - positions.getY(index)) * positionAlpha,
          positions.getZ(index) + (targetPosition[2] - positions.getZ(index)) * positionAlpha,
        );
        remaining = Math.max(remaining, Math.abs(targetPosition[0] - positions.getX(index)), Math.abs(targetPosition[1] - positions.getY(index)), Math.abs(targetPosition[2] - positions.getZ(index)));
      }
      remaining = Math.max(remaining, Math.abs(sizeDelta), Math.abs(strengthDelta));
    });
    positions.needsUpdate = sizes.needsUpdate = strengths.needsUpdate = true;
    settling.current = Boolean(extraction) || remaining > 0.002;
    if (settling.current) invalidate();
  });

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} frustumCulled={false} raycast={() => null}>
    <shaderMaterial vertexShader={neuronVertexShader} fragmentShader={neuronFragmentShader}
      uniforms={uniforms} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>;
}

/** Reuse the same nucleus in tree previews/editors; their invisible hit targets stay separate. */
export function NeuronStar({ color = '#c8edff', selected = false, size = 26, learningState = 'unknown' }: { color?: string; selected?: boolean; size?: number; learningState?: LearningState }) {
  const dpr = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => {
    const next = pointGeometry(1);
    const appearance = neuronAppearance('knowledge', selected ? 'selected' : 'contextual', false, learningState);
    const tint = new THREE.Color(color);
    if (learningState !== 'unknown') tint.lerp(new THREE.Color(LEARNING_STATE_COLORS[learningState]), 0.5);
    tint.lerp(new THREE.Color('#c8edff'), 0.58);
    next.getAttribute('color').setXYZ(0, tint.r, tint.g, tint.b);
    next.getAttribute('aSize').setX(0, appearance.size / 23 * size);
    next.getAttribute('aStrength').setX(0, appearance.strength);
    return next;
  }, [color, learningState, selected, size]);
  const uniforms = useMemo(() => ({ uDpr: { value: dpr } }), [dpr]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} raycast={() => null} frustumCulled={false}>
    <shaderMaterial vertexShader={neuronVertexShader} fragmentShader={neuronFragmentShader}
      uniforms={uniforms} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>;
}
