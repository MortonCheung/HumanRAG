import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneEdge, SceneModel } from '../graph/types';
import { CHAIN_GOLD, HOT_CORE } from '../design/domainPalette';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';

const ACTIVE_STATES = new Set(['upstream', 'downstream', 'path', 'lateral', 'lensActive']);

interface EdgeLayout { positions: Float32Array; progress: Float32Array }

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function curveControls(edge: SceneEdge, source: [number, number, number], target: [number, number, number]) {
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  const dz = target[2] - source[2];
  const distance = Math.max(Math.hypot(dx, dy, dz), 0.001);
  const nx = dx / distance; const ny = dy / distance; const nz = dz / distance;
  let px = Math.abs(ny) > 0.86 ? 0 : -nz;
  let py = Math.abs(ny) > 0.86 ? nz : 0;
  let pz = Math.abs(ny) > 0.86 ? -ny : nx;
  const perpendicularLength = Math.max(Math.hypot(px, py, pz), 0.001);
  const sign = stableHash(edge.id) % 2 === 0 ? -1 : 1;
  px = (px / perpendicularLength) * sign; py = (py / perpendicularLength) * sign; pz = (pz / perpendicularLength) * sign;
  const phase = ((stableHash(edge.id) % 1000) / 1000 - 0.5) * 0.7;
  if (edge.relationType === 'hierarchy' || edge.relationType === 'practice_for') {
    const bend = Math.min(1.8, distance * 0.075) * (1 + phase);
    return {
      cubic: true,
      c1: [source[0] + dx * 0.34 + px * bend, source[1] + dy * 0.34 + py * bend, source[2] + dz * 0.34 + pz * bend],
      c2: [source[0] + dx * 0.68 + px * bend * 0.66, source[1] + dy * 0.68 + py * bend * 0.66, source[2] + dz * 0.68 + pz * bend * 0.66],
    };
  }
  const bend = Math.min(3.2, distance * 0.16) * (1 + phase);
  return { cubic: false, c1: [source[0] + dx * 0.5 + px * bend, source[1] + dy * 0.5 + py * bend + Math.min(2.4, distance * 0.08), source[2] + dz * 0.5 + pz * bend], c2: [0, 0, 0] };
}

function evaluateCurve(source: [number, number, number], target: [number, number, number], controls: ReturnType<typeof curveControls>, t: number, out: Float32Array, offset: number) {
  const inverse = 1 - t;
  if (controls.cubic) {
    const a = inverse * inverse * inverse; const b = 3 * inverse * inverse * t; const c = 3 * inverse * t * t; const d = t * t * t;
    out[offset] = a * source[0] + b * controls.c1[0] + c * controls.c2[0] + d * target[0];
    out[offset + 1] = a * source[1] + b * controls.c1[1] + c * controls.c2[1] + d * target[1];
    out[offset + 2] = a * source[2] + b * controls.c1[2] + c * controls.c2[2] + d * target[2];
  } else {
    const a = inverse * inverse; const b = 2 * inverse * t; const c = t * t;
    out[offset] = a * source[0] + b * controls.c1[0] + c * target[0];
    out[offset + 1] = a * source[1] + b * controls.c1[1] + c * target[1];
    out[offset + 2] = a * source[2] + b * controls.c1[2] + c * target[2];
  }
}

function buildLayout(model: SceneModel, segmentCount: number): EdgeLayout {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const vertexCount = model.edges.length * segmentCount * 2;
  const positions = new Float32Array(vertexCount * 3);
  const progress = new Float32Array(vertexCount);
  let vertex = 0;
  model.edges.forEach((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    const sourcePosition = source?.displayPosition ?? [0, 0, 0];
    const targetPosition = target?.displayPosition ?? [0, 0, 0];
    const controls = curveControls(edge, sourcePosition, targetPosition);
    for (let index = 0; index < segmentCount; index += 1) {
      evaluateCurve(sourcePosition, targetPosition, controls, index / segmentCount, positions, vertex * 3);
      progress[vertex++] = index / segmentCount;
      evaluateCurve(sourcePosition, targetPosition, controls, (index + 1) / segmentCount, positions, vertex * 3);
      progress[vertex++] = (index + 1) / segmentCount;
    }
  });
  return { positions, progress };
}

function alphaFor(edge: SceneEdge, phase: SpatialExperiencePhase) {
  if (edge.visualState === 'background') return phase === 'landing' ? 0.12 : 0.075;
  if (edge.visualState === 'contextual') return 0.13;
  if (edge.visualState === 'lensActive') return 0.3;
  if (edge.visualState === 'lateral') return 0.34;
  return 0.72;
}

const vertexShader = `
  attribute float aProgress; attribute float aDelay; attribute float aDirection;
  attribute float aAlpha; attribute float aActive;
  varying float vProgress; varying float vDelay; varying float vDirection;
  varying float vAlpha; varying float vActive; varying vec3 vColor;
  void main(){vProgress=aProgress;vDelay=aDelay;vDirection=aDirection;vAlpha=aAlpha;vActive=aActive;vColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const fragmentShader = `
  uniform float uTime; varying float vProgress; varying float vDelay; varying float vDirection;
  varying float vAlpha; varying float vActive; varying vec3 vColor;
  void main(){float directed=vDirection<0.0?1.0-vProgress:vProgress;float p=fract(uTime*0.22+vDelay*0.7);float d=abs(directed-p);d=min(d,1.0-d);float signal=(1.0-smoothstep(0.0,0.07,d))*vActive;gl_FragColor=vec4(mix(vColor,vec3(1.0,0.985,0.91),signal*0.58),vAlpha*(1.0+signal*0.58));}
`;

/** 固定拓扑的单批次连线：同树切点只更新属性，树聚散才计算曲线并连续插值。 */
export function BatchedKnowledgeEdges({ model, experiencePhase }: { model: SceneModel; experiencePhase: SpatialExperiencePhase }) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const segmentCount = Math.max(4, QUALITY_CONFIG[quality].curveSegments);
  const material = useRef<THREE.ShaderMaterial>(null);
  const targetPositions = useRef<Float32Array | null>(null);
  const moving = useRef(false);
  const { invalidate } = useThree();

  const layout = useMemo(
    () => buildLayout(model, segmentCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model.edges.length, model.nodes.length, segmentCount],
  );
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(layout.positions.slice(), 3).setUsage(THREE.DynamicDrawUsage));
    next.setAttribute('aProgress', new THREE.BufferAttribute(layout.progress, 1));
    const vertexCount = layout.progress.length;
    next.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    next.setAttribute('aDelay', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
    next.setAttribute('aDirection', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
    next.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
    next.setAttribute('aActive', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
    targetPositions.current = layout.positions.slice();
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentCount]);

  useEffect(() => {
    targetPositions.current = layout.positions;
    const current = geometry.getAttribute('position').array as Float32Array;
    moving.current = current.some((value, index) => Math.abs(value - layout.positions[index]) > 0.001);
    invalidate();
  }, [geometry, invalidate, layout]);

  useEffect(() => {
    const byId = new Map(model.nodes.map((node) => [node.id, node]));
    const colorAttribute = geometry.getAttribute('color') as THREE.BufferAttribute;
    const delayAttribute = geometry.getAttribute('aDelay') as THREE.BufferAttribute;
    const directionAttribute = geometry.getAttribute('aDirection') as THREE.BufferAttribute;
    const alphaAttribute = geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
    const activeAttribute = geometry.getAttribute('aActive') as THREE.BufferAttribute;
    const color = new THREE.Color();
    const targetColor = new THREE.Color();
    const gold = new THREE.Color(CHAIN_GOLD);
    let vertex = 0;
    model.edges.forEach((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      const active = ACTIVE_STATES.has(edge.visualState);
      if (active) {
        color.set(edge.visualState === 'upstream' ? HOT_CORE : edge.visualState === 'downstream' ? target?.domainColor ?? CHAIN_GOLD : CHAIN_GOLD);
        color.lerp(gold, edge.visualState === 'downstream' ? 0.28 : 0.5);
      } else {
        color.set(source?.domainColor ?? '#708080');
        targetColor.set(target?.domainColor ?? '#708080');
        color.lerp(targetColor, 0.5).multiplyScalar(0.54);
      }
      for (let index = 0; index < segmentCount * 2; index += 1) {
        colorAttribute.setXYZ(vertex, color.r, color.g, color.b);
        delayAttribute.setX(vertex, edge.propagationDelay);
        directionAttribute.setX(vertex, edge.direction === 'in' ? -1 : 1);
        alphaAttribute.setX(vertex, alphaFor(edge, experiencePhase));
        activeAttribute.setX(vertex, active ? 1 : 0);
        vertex += 1;
      }
    });
    [colorAttribute, delayAttribute, directionAttribute, alphaAttribute, activeAttribute].forEach((attribute) => { attribute.needsUpdate = true; });
    invalidate();
  }, [experiencePhase, geometry, invalidate, model.edges, model.nodes, segmentCount]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
    if (!moving.current || !targetPositions.current) return;
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    const current = attribute.array as Float32Array;
    const target = targetPositions.current;
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 5.4);
    let maxDelta = 0;
    for (let index = 0; index < current.length; index += 1) {
      const difference = target[index] - current[index];
      maxDelta = Math.max(maxDelta, Math.abs(difference));
      current[index] += difference * alpha;
    }
    attribute.needsUpdate = true;
    if (maxDelta < 0.012) {
      current.set(target);
      attribute.needsUpdate = true;
      moving.current = false;
    } else invalidate();
  });

  return <lineSegments geometry={geometry}><shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} vertexColors uniforms={{ uTime: { value: 0 } }} /></lineSegments>;
}
