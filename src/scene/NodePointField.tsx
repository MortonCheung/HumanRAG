import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneModel } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';
import { neuronAppearance, neuronFragmentShader, neuronVertexShader } from './neuronAppearance';

function pointGeometry(count: number) {
  const geometry = new THREE.BufferGeometry();
  for (const [name, itemSize] of [['position', 3], ['color', 3], ['aSize', 1], ['aStrength', 1]] as const) {
    geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count * itemSize), itemSize).setUsage(THREE.DynamicDrawUsage));
  }
  return geometry;
}

/** One real node, one emissive point. Its halo never needs lighting or postprocessing. */
export function NodePointField({ model, experiencePhase, motionAllowed }: {
  model: SceneModel;
  experiencePhase: SpatialExperiencePhase;
  motionAllowed: boolean;
}) {
  const hoveredNodeId = useKnowledgeStore((state) => state.hoveredNodeId);
  const { invalidate, viewport } = useThree();
  const geometry = useMemo(() => pointGeometry(model.nodes.length), [model.nodes.length]);
  const targets = useRef<Array<{ size: number; strength: number }>>([]);
  const settling = useRef(false);
  const uniforms = useMemo(() => ({ uDpr: { value: viewport.dpr } }), [viewport.dpr]);

  useLayoutEffect(() => {
    const positions = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color');
    const color = new THREE.Color();
    const white = new THREE.Color('#c8edff');
    model.nodes.forEach((node, index) => {
      positions.setXYZ(index, ...node.displayPosition);
      color.set(node.domainColor).lerp(white, 0.7);
      colors.setXYZ(index, color.r, color.g, color.b);
    });
    positions.needsUpdate = colors.needsUpdate = true;
    invalidate();
  }, [geometry, model.nodes, invalidate]);

  useLayoutEffect(() => {
    const sizes = geometry.getAttribute('aSize');
    const strengths = geometry.getAttribute('aStrength');
    model.nodes.forEach((node, index) => {
      const appearance = neuronAppearance(node.type, node.visualState, node.id === hoveredNodeId);
      if (experiencePhase !== 'universe') appearance.strength = Math.max(0.9, appearance.strength);
      targets.current[index] = appearance;
      if (!motionAllowed || sizes.getX(index) === 0) {
        sizes.setX(index, appearance.size);
        strengths.setX(index, appearance.strength);
      }
    });
    targets.current.length = model.nodes.length;
    [sizes, strengths].forEach((attribute) => { attribute.needsUpdate = true; });
    settling.current = motionAllowed;
    invalidate();
  }, [geometry, model.nodes, hoveredNodeId, experiencePhase, motionAllowed, invalidate]);

  useFrame((_, delta) => {
    if (!settling.current) return;
    const sizes = geometry.getAttribute('aSize');
    const strengths = geometry.getAttribute('aStrength');
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 14);
    let remaining = 0;
    targets.current.forEach((target, index) => {
      const sizeDelta = target.size - sizes.getX(index);
      const strengthDelta = target.strength - strengths.getX(index);
      sizes.setX(index, sizes.getX(index) + sizeDelta * alpha);
      strengths.setX(index, strengths.getX(index) + strengthDelta * alpha);
      remaining = Math.max(remaining, Math.abs(sizeDelta), Math.abs(strengthDelta));
    });
    sizes.needsUpdate = strengths.needsUpdate = true;
    settling.current = remaining > 0.002;
    if (settling.current) invalidate();
  });

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} frustumCulled={false} raycast={() => null}>
    <shaderMaterial vertexShader={neuronVertexShader} fragmentShader={neuronFragmentShader}
      uniforms={uniforms} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>;
}

/** Reuse the same nucleus in tree previews/editors; their invisible hit targets stay separate. */
export function NeuronStar({ color = '#c8edff', selected = false, size = 26 }: { color?: string; selected?: boolean; size?: number }) {
  const dpr = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => {
    const next = pointGeometry(1);
    const tint = new THREE.Color(color).lerp(new THREE.Color('#c8edff'), 0.7);
    next.getAttribute('color').setXYZ(0, tint.r, tint.g, tint.b);
    next.getAttribute('aSize').setX(0, selected ? size * 1.4 : size);
    next.getAttribute('aStrength').setX(0, selected ? 1.25 : 1);
    return next;
  }, [color, selected, size]);
  const uniforms = useMemo(() => ({ uDpr: { value: dpr } }), [dpr]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} raycast={() => null} frustumCulled={false}>
    <shaderMaterial vertexShader={neuronVertexShader} fragmentShader={neuronFragmentShader}
      uniforms={uniforms} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>;
}
