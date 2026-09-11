import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { SceneEdge, SceneModel } from '../graph/types';
import { buildEdgeCurve } from '../graph/curves';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';

const ACTIVE = new Set(['upstream', 'downstream', 'path', 'lateral', 'lensActive']);
const phaseFor = (id: string) => Array.from(id).reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0, 7) % 997 / 997;

export function selectPulsingEdgeIds(edges: SceneEdge[], budget: number) {
  return new Set([...edges]
    .sort((a, b) => Number(ACTIVE.has(b.visualState)) - Number(ACTIVE.has(a.visualState)) || phaseFor(a.id) - phaseFor(b.id))
    .slice(0, Math.max(0, budget))
    .map((edge) => edge.id));
}

/** Includes identity and positions, so equal-sized topology edits are not lost. */
export function edgeGeometryKey(model: SceneModel) {
  return JSON.stringify([model.nodes.map((n) => [n.id, n.displayPosition]), model.edges.map((e) => [e.id, e.source, e.target, e.relationType])]);
}

export function buildEdgeGeometry(model: SceneModel, segments: number) {
  const nodes = new Map(model.nodes.map((node) => [node.id, node.displayPosition]));
  const count = model.edges.length * segments * 2;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const progress = new Float32Array(count);
  const phases = new Float32Array(count);
  const point = new THREE.Vector3();
  let vertex = 0;
  for (const edge of model.edges) {
    const curve = buildEdgeCurve(edge, nodes.get(edge.source) ?? [0, 0, 0], nodes.get(edge.target) ?? [0, 0, 0]);
    for (let segment = 0; segment < segments; segment += 1) {
      for (const t of [segment / segments, (segment + 1) / segments]) {
        curve.getPoint(t, point).toArray(positions, vertex * 3);
        progress[vertex] = t;
        phases[vertex++] = phaseFor(edge.id);
      }
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  for (const name of ['aAlpha', 'aActive', 'aDirection', 'aDelay']) geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

const vertexShader = `
  attribute float aProgress, aPhase, aAlpha, aActive, aDirection, aDelay;
  varying float vProgress, vPhase, vAlpha, vActive, vDirection, vDelay;
  void main() {
    vProgress=aProgress; vPhase=aPhase; vAlpha=aAlpha; vActive=aActive; vDirection=aDirection; vDelay=aDelay;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;
export const synapticPulseShader = `
  uniform float uTime, uMotion, uRevealTime, uOpening;
  varying float vProgress, vPhase, vAlpha, vActive, vDirection, vDelay;
  void main() {
    float directed=vDirection<0.0?1.0-vProgress:vProgress;
    float head=fract(uTime*0.18+vPhase)*1.3-0.15;
    float behind=head-directed;
    float peak=exp(-pow(behind/0.025,2.0));
    float tail=exp(-max(behind,0.0)*24.0)*smoothstep(-0.015,0.015,behind);
    float pulse=(peak+tail*0.35)*vActive*uMotion;
    float junction=exp(-directed*14.0)+exp(-(1.0-directed)*14.0);
    vec3 color=mix(vec3(0.46,0.62,0.72),vec3(0.90,0.98,1.0),min(1.0,pulse));
    float travel=clamp((uRevealTime-vDelay)/0.14,0.0,1.0);
    float grown=1.0-smoothstep(travel-0.025,travel+0.025,vProgress);
    float reveal=mix(1.0,grown,uOpening);
    gl_FragColor=vec4(color,(vAlpha*(0.75+junction*0.25)+pulse*0.54)*reveal);
  }
`;

/** One path batch and one render clock. Camera gestures never stop synaptic transmission. */
export function BatchedKnowledgeEdges({ model, experiencePhase, motionAllowed }: { model: SceneModel; experiencePhase: SpatialExperiencePhase; motionAllowed: boolean }) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const segments = QUALITY_CONFIG[quality].curveSegments;
  const { invalidate } = useThree();
  const key = edgeGeometryKey(model);
  // Appearance changes leave positions, topology and material identity untouched.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => buildEdgeGeometry(model, segments), [key, segments]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uMotion: { value: 1 }, uRevealTime: { value: 10 }, uOpening: { value: 0 } }), []);
  useLayoutEffect(() => {
    const pulsing = selectPulsingEdgeIds(model.edges, QUALITY_CONFIG[quality].activePulseCount);
    let vertex = 0;
    for (const edge of model.edges) {
      const active = ACTIVE.has(edge.visualState);
      const primary = edge.relationType === 'hierarchy' || edge.relationType === 'practice_for';
      for (let index = 0; index < segments * 2; index += 1) {
        geometry.getAttribute('aAlpha').setX(vertex, active ? 0.45 : primary ? 0.16 : 0.045);
        geometry.getAttribute('aActive').setX(vertex, pulsing.has(edge.id) ? active ? 0.9 : 0.2 : 0);
        geometry.getAttribute('aDirection').setX(vertex++, edge.direction === 'in' ? -1 : 1);
        geometry.getAttribute('aDelay').setX(vertex - 1, edge.propagationDelay);
      }
    }
    for (const name of ['aAlpha', 'aActive', 'aDirection', 'aDelay']) geometry.getAttribute(name).needsUpdate = true;
    invalidate();
  }, [geometry, model.edges, quality, segments, invalidate]);
  useEffect(() => {
    uniforms.uMotion.value = motionAllowed ? 1 : 0;
    invalidate();
    if (!motionAllowed) return;
    // Demand rendering idles at a modest rate; CameraControls requests full-rate frames during input.
    const timer = window.setInterval(invalidate, 1000 / QUALITY_CONFIG[quality].idleFps);
    return () => window.clearInterval(timer);
  }, [motionAllowed, quality, invalidate, uniforms]);
  useEffect(() => {
    if (experiencePhase === 'awakening') {
      uniforms.uRevealTime.value = 0;
      uniforms.uOpening.value = 1;
    } else if (experiencePhase === 'intro' || experiencePhase === 'universe') {
      uniforms.uRevealTime.value = 10;
      uniforms.uOpening.value = 0;
    }
    invalidate();
  }, [experiencePhase, invalidate, uniforms]);
  useFrame(({ clock }, delta) => {
    if (motionAllowed) uniforms.uTime.value = clock.elapsedTime;
    if ((experiencePhase === 'awakening' || experiencePhase === 'settling') && uniforms.uRevealTime.value < 3) {
      uniforms.uRevealTime.value += Math.min(delta, .05);
    }
  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry} raycast={() => null}>
    <shaderMaterial vertexShader={vertexShader} fragmentShader={synapticPulseShader} uniforms={uniforms} transparent depthWrite={false} toneMapped={false} />
  </lineSegments>;
}
