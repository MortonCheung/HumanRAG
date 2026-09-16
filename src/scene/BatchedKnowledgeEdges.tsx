import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneEdge, SceneModel } from '../graph/types';
import { buildEdgeCurve } from '../graph/curves';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';
import { extractionProgress, type ExtractionPhase } from '../features/spatial/transitions/goalTreeTransitionStore';

const ACTIVE = new Set(['upstream', 'downstream', 'path', 'lateral', 'lensActive']);
export const phaseFor = (id: string) => Array.from(id).reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0, 7) % 997 / 997;
export const OPENING_NODE_FADE_SECONDS = 0.12;
export const OPENING_EDGE_QUEUE_MIN_SECONDS = 0.04;
export const OPENING_EDGE_QUEUE_MAX_SECONDS = 0.30;
export const OPENING_EDGE_BUILD_MIN_SECONDS = 0.18;
export const OPENING_EDGE_BUILD_MAX_SECONDS = 0.25;
export const OPENING_PULSE_PAUSE_SECONDS = 0.05;
export const OPENING_PULSE_FADE_SECONDS = 0.15;

export interface OpeningEdgeTiming {
  edgeId: string;
  sourceReadyAt: number;
  targetReadyAt: number;
  eligibleAt: number;
  queueDelay: number;
  buildDuration: number;
  startAt: number;
  endAt: number;
}

export interface OpeningEdgeTimeline {
  edgeTimings: ReadonlyMap<string, OpeningEdgeTiming>;
  networkReadyAt: number;
  pulseStart: number;
  pulseEnd: number;
}

export function nodeReadyAt(delay: number) {
  return delay === 0 ? 0 : delay + OPENING_NODE_FADE_SECONDS;
}

export function buildOpeningEdgeTiming(edgeId: string, sourceDelay: number, targetDelay: number): OpeningEdgeTiming {
  const sourceReadyAt = nodeReadyAt(sourceDelay);
  const targetReadyAt = nodeReadyAt(targetDelay);
  const eligibleAt = Math.max(sourceReadyAt, targetReadyAt);
  const queueDelay = THREE.MathUtils.lerp(
    OPENING_EDGE_QUEUE_MIN_SECONDS,
    OPENING_EDGE_QUEUE_MAX_SECONDS,
    phaseFor(edgeId),
  );
  const buildDuration = THREE.MathUtils.lerp(
    OPENING_EDGE_BUILD_MIN_SECONDS,
    OPENING_EDGE_BUILD_MAX_SECONDS,
    phaseFor(`${edgeId}:build`),
  );
  const startAt = eligibleAt + queueDelay;
  return {
    edgeId,
    sourceReadyAt,
    targetReadyAt,
    eligibleAt,
    queueDelay,
    buildDuration,
    startAt,
    endAt: startAt + buildDuration,
  };
}

export function buildOpeningEdgeTimeline(model: Pick<SceneModel, 'nodes' | 'edges'>): OpeningEdgeTimeline {
  const nodeDelays = new Map(model.nodes.map((node) => [node.id, node.propagationDelay]));
  const edgeTimings = new Map<string, OpeningEdgeTiming>();
  let networkReadyAt = 0;
  for (const edge of model.edges) {
    const sourceDelay = nodeDelays.get(edge.source);
    const targetDelay = nodeDelays.get(edge.target);
    if (sourceDelay === undefined || targetDelay === undefined) {
      throw new Error(`Opening edge "${edge.id}" references a missing endpoint.`);
    }
    const timing = buildOpeningEdgeTiming(edge.id, sourceDelay, targetDelay);
    edgeTimings.set(edge.id, timing);
    networkReadyAt = Math.max(networkReadyAt, timing.endAt);
  }
  const pulseStart = networkReadyAt + OPENING_PULSE_PAUSE_SECONDS;
  return {
    edgeTimings,
    networkReadyAt,
    pulseStart,
    pulseEnd: pulseStart + OPENING_PULSE_FADE_SECONDS,
  };
}

export function openingPulseGate(timeline: OpeningEdgeTimeline, elapsed: number) {
  return THREE.MathUtils.smoothstep(elapsed, timeline.pulseStart, timeline.pulseEnd);
}

/** CPU equivalent of the two-ended shader mask, kept small so the visual contract is testable. */
export function openingEdgeRevealMask(elapsed: number, timing: Pick<OpeningEdgeTiming, 'startAt' | 'buildDuration'>, progress: number) {
  const rawLocal = (elapsed - timing.startAt) / Math.max(timing.buildDuration, 0.001);
  if (rawLocal < 0) return 0;
  const local = THREE.MathUtils.clamp(rawLocal, 0, 1);
  const eased = local * local * (3 - 2 * local);
  const centerDistance = Math.abs(progress - 0.5) * 2;
  const threshold = 1 - eased;
  const reveal = THREE.MathUtils.smoothstep(centerDistance, threshold - 0.045, threshold + 0.045);
  return local >= 0.999 ? 1 : reveal;
}

export function edgeAlpha(edge: SceneEdge, experiencePhase: SpatialExperiencePhase) {
  const active = ACTIVE.has(edge.visualState);
  if (experiencePhase === 'intro') return 0;
  if (active) return 0.45;
  return edge.relationType === 'hierarchy' || edge.relationType === 'practice_for' ? 0.16 : 0.045;
}

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
  for (const name of ['aAlpha', 'aActive', 'aDirection', 'aDelay', 'aRevealDuration']) geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export const edgeVertexShader = `
  attribute float aProgress, aPhase, aAlpha, aActive, aDirection, aDelay, aRevealDuration;
  varying float vProgress, vPhase, vAlpha, vActive, vDirection, vDelay, vRevealDuration;
  void main() {
    vProgress=aProgress; vPhase=aPhase; vAlpha=aAlpha; vActive=aActive; vDirection=aDirection;
    vDelay=aDelay; vRevealDuration=aRevealDuration;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;
export const synapticPulseShader = `
  uniform float uTime, uMotion, uOpening, uOpeningElapsed, uPulseGate, uDetach, uUniverseExit;
  varying float vProgress, vPhase, vAlpha, vActive, vDirection, vDelay, vRevealDuration;
  void main() {
    float directed=vDirection<0.0?1.0-vProgress:vProgress;
    float head=fract(uTime*0.21+vPhase)*1.3-0.15;
    float behind=head-directed;
    float peak=exp(-pow(behind/0.032,2.0));
    float tail=exp(-max(behind,0.0)*18.0)*smoothstep(-0.015,0.015,behind);
    float pulse=(peak+tail*0.46)*vActive*uMotion*uPulseGate;
    float breathing=(0.5+0.5*sin(uTime*1.1+vPhase*6.283))*0.035*vActive*uMotion*uPulseGate;
    float junction=exp(-directed*14.0)+exp(-(1.0-directed)*14.0);
    vec3 color=mix(vec3(0.46,0.62,0.72),vec3(0.90,0.98,1.0),min(1.0,pulse));
    float rawLocal=(uOpeningElapsed-vDelay)/max(vRevealDuration,0.001);
    float local=clamp(rawLocal,0.0,1.0);
    float started=step(0.0,rawLocal);
    float eased=local*local*(3.0-2.0*local);
    float centerDistance=abs(vProgress - 0.5)*2.0;
    float threshold=1.0-eased;
    float edgeReveal=started*smoothstep(threshold-0.045,threshold+0.045,centerDistance);
    edgeReveal=max(edgeReveal,started*step(0.999,local));
    float centerFlash=exp(-pow((vProgress-0.5)/0.055,2.0))*exp(-pow((rawLocal-0.97)/0.025,2.0))*0.13*started*uOpening;
    color=mix(color,vec3(0.94,0.985,1.0),min(1.0,centerFlash*5.0));
    float reveal=uOpening>0.5?edgeReveal:1.0;
    float keep=smoothstep(uDetach-0.07,uDetach+0.07,centerDistance);
    gl_FragColor=vec4(color,(vAlpha*(0.75+junction*0.25)+pulse*0.86+breathing+centerFlash)*reveal*keep*uUniverseExit);
  }
`;

/** One path batch and one render clock. Camera gestures never stop synaptic transmission. */
export function BatchedKnowledgeEdges({ model, experiencePhase, motionAllowed, extraction }: {
  model: SceneModel;
  experiencePhase: SpatialExperiencePhase;
  motionAllowed: boolean;
  extraction?: { phase: ExtractionPhase; phaseStartedAt: number };
}) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const segments = QUALITY_CONFIG[quality].curveSegments;
  const { invalidate } = useThree();
  const key = edgeGeometryKey(model);
  // Appearance changes leave positions, topology and material identity untouched.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => buildEdgeGeometry(model, segments), [key, segments]);
  const openingTimeline = useMemo(() => buildOpeningEdgeTimeline(model), [model.nodes, model.edges]);
  const startsInUniverse = experiencePhase === 'universe';
  const uniforms = useRef({
    uTime: { value: 0 }, uMotion: { value: 1 }, uOpening: { value: startsInUniverse ? 0 : 1 },
    uOpeningElapsed: { value: 0 }, uPulseGate: { value: startsInUniverse ? 1 : 0 },
    uDetach: { value: -1 }, uUniverseExit: { value: 1 },
  }).current;
  const material = useRef<THREE.ShaderMaterial>(null);
  const openingElapsed = useRef(0);
  useLayoutEffect(() => {
    const pulsing = selectPulsingEdgeIds(model.edges, QUALITY_CONFIG[quality].activePulseCount);
    let vertex = 0;
    for (const edge of model.edges) {
      const active = ACTIVE.has(edge.visualState);
      const timing = openingTimeline.edgeTimings.get(edge.id);
      if (!timing) throw new Error(`Opening edge "${edge.id}" is missing its timing.`);
      for (let index = 0; index < segments * 2; index += 1) {
        geometry.getAttribute('aAlpha').setX(vertex, edgeAlpha(edge, experiencePhase));
        geometry.getAttribute('aActive').setX(vertex, pulsing.has(edge.id) ? active ? 0.9 : 0.2 : 0);
        geometry.getAttribute('aDirection').setX(vertex++, edge.direction === 'in' ? -1 : 1);
        geometry.getAttribute('aDelay').setX(vertex - 1, timing.startAt);
        geometry.getAttribute('aRevealDuration').setX(vertex - 1, timing.buildDuration);
      }
    }
    for (const name of ['aAlpha', 'aActive', 'aDirection', 'aDelay', 'aRevealDuration']) geometry.getAttribute(name).needsUpdate = true;
    invalidate();
  }, [geometry, model.edges, quality, segments, experiencePhase, openingTimeline, invalidate]);
  useEffect(() => {
    const shaderUniforms = material.current?.uniforms ?? uniforms;
    shaderUniforms.uMotion.value = motionAllowed ? 1 : 0;
    invalidate();
    if (!motionAllowed) return;
    // Demand rendering idles at a modest rate; CameraControls requests full-rate frames during input.
    const timer = window.setInterval(invalidate, 1000 / QUALITY_CONFIG[quality].idleFps);
    return () => window.clearInterval(timer);
  }, [motionAllowed, quality, invalidate, uniforms]);
  useLayoutEffect(() => {
    const shaderUniforms = material.current?.uniforms ?? uniforms;
    // 相位必须在首帧绘制前落到 uniform 上，避免 Opening 的第一帧闪出完整线网。
    if (experiencePhase === 'intro') {
      openingElapsed.current = 0;
      shaderUniforms.uOpening.value = 1;
      shaderUniforms.uOpeningElapsed.value = 0;
      shaderUniforms.uPulseGate.value = 0;
    } else if (experiencePhase === 'awakening') {
      openingElapsed.current = 0;
      shaderUniforms.uOpening.value = 1;
      shaderUniforms.uOpeningElapsed.value = 0;
      shaderUniforms.uPulseGate.value = 0;
    } else if (experiencePhase === 'settling') {
      shaderUniforms.uOpening.value = 1;
    } else if (experiencePhase === 'universe') {
      shaderUniforms.uOpening.value = 0;
      shaderUniforms.uPulseGate.value = 1;
    }
    invalidate();
  }, [experiencePhase, invalidate, uniforms]);
  useFrame(({ clock }, delta) => {
    const shaderUniforms = material.current?.uniforms ?? uniforms;
    if (motionAllowed) shaderUniforms.uTime.value = clock.elapsedTime;
    if (!extraction || extraction.phase === 'idle') {
      shaderUniforms.uDetach.value = -1;
      shaderUniforms.uUniverseExit.value = 1;
    } else if (extraction.phase === 'highlighting') {
      // highlighting 必须完整保留 Universe（手册第 21 章）：断开留给 detaching。
      shaderUniforms.uDetach.value = -1;
      shaderUniforms.uUniverseExit.value = 1;
    } else if (extraction.phase === 'detaching') {
      const progress = extractionProgress(extraction.phase, extraction.phaseStartedAt, motionAllowed);
      shaderUniforms.uDetach.value = THREE.MathUtils.lerp(-0.05, 1.05, progress);
      shaderUniforms.uUniverseExit.value = 1 - progress;
    } else {
      shaderUniforms.uDetach.value = 1.05;
      shaderUniforms.uUniverseExit.value = 0;
    }
    if ((experiencePhase === 'awakening' || experiencePhase === 'settling') && motionAllowed && openingElapsed.current < 3) {
      // Keep the reveal clock aligned with the GSAP handoff even on low-frame-rate devices.
      openingElapsed.current += delta;
      shaderUniforms.uOpeningElapsed.value = openingElapsed.current;
      shaderUniforms.uPulseGate.value = openingPulseGate(openingTimeline, openingElapsed.current);
    }
  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry} raycast={() => null}>
    <shaderMaterial ref={material} vertexShader={edgeVertexShader} fragmentShader={synapticPulseShader} uniforms={uniforms} transparent depthWrite={false} toneMapped={false} />
  </lineSegments>;
}
