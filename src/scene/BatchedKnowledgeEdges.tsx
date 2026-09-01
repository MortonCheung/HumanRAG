import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import * as THREE from 'three';
import { buildEdgeCurve } from '../graph/curves';
import type { SceneEdge, SceneModel } from '../graph/types';
import { CHAIN_GOLD, HOT_CORE } from '../design/domainPalette';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';

const ACTIVE_STATES = new Set(['upstream', 'downstream', 'path', 'lateral', 'lensActive']);

function buildGeometry(edges: SceneEdge[], model: SceneModel, active: boolean, segmentBudget: number) {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const positions: number[] = [];
  const colors: number[] = [];
  const progress: number[] = [];
  const delay: number[] = [];
  const direction: number[] = [];
  const color = new THREE.Color();

  edges
    .filter((edge) => active ? ACTIVE_STATES.has(edge.visualState) : !ACTIVE_STATES.has(edge.visualState))
    .forEach((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) return;
      const segmentCount = active ? Math.max(6, segmentBudget) : Math.max(3, Math.round(segmentBudget * 0.55));
      const points = buildEdgeCurve(edge, source.displayPosition, target.displayPosition).getPoints(segmentCount);
      if (active) {
        color.set(edge.visualState === 'upstream' ? HOT_CORE : edge.visualState === 'downstream' ? target.domainColor : CHAIN_GOLD);
        color.lerp(new THREE.Color(CHAIN_GOLD), edge.visualState === 'downstream' ? 0.28 : 0.52);
      } else {
        color.set(source.domainColor).lerp(new THREE.Color(target.domainColor), 0.5).multiplyScalar(0.54);
      }

      for (let index = 0; index < points.length - 1; index += 1) {
        positions.push(...points[index].toArray(), ...points[index + 1].toArray());
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        progress.push(index / segmentCount, (index + 1) / segmentCount);
        delay.push(edge.propagationDelay, edge.propagationDelay);
        const sign = edge.direction === 'in' ? -1 : 1;
        direction.push(sign, sign);
      }
    });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (active) {
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progress, 1));
    geometry.setAttribute('aDelay', new THREE.Float32BufferAttribute(delay, 1));
    geometry.setAttribute('aDirection', new THREE.Float32BufferAttribute(direction, 1));
  }
  return geometry;
}

const activeVertex = `
  attribute float aProgress;
  attribute float aDelay;
  attribute float aDirection;
  varying float vProgress;
  varying float vDelay;
  varying float vDirection;
  varying vec3 vColor;
  void main() {
    vProgress = aProgress;
    vDelay = aDelay;
    vDirection = aDirection;
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const activeFragment = `
  uniform float uReveal;
  uniform float uTime;
  varying float vProgress;
  varying float vDelay;
  varying float vDirection;
  varying vec3 vColor;
  void main() {
    float reveal = clamp((uReveal - vDelay) * 1.32, 0.0, 1.0);
    float revealMask = 1.0 - smoothstep(reveal, reveal + 0.08, vProgress);
    float directedProgress = vDirection < 0.0 ? 1.0 - vProgress : vProgress;
    float signalPosition = fract(uTime * 0.24 + vDelay * 0.7);
    float signalDistance = abs(directedProgress - signalPosition);
    signalDistance = min(signalDistance, 1.0 - signalDistance);
    float signal = 1.0 - smoothstep(0.0, 0.075, signalDistance);
    float alpha = revealMask * (0.54 + signal * 0.46);
    gl_FragColor = vec4(mix(vColor, vec3(1.0, 0.985, 0.91), signal * 0.62), alpha);
  }
`;

export function BatchedKnowledgeEdges({ model }: { model: SceneModel }) {
  const { invalidate } = useThree();
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const segmentBudget = QUALITY_CONFIG[quality].curveSegments;
  const activeMaterial = useRef<THREE.ShaderMaterial>(null);
  const background = useMemo(() => buildGeometry(model.edges, model, false, segmentBudget), [model, segmentBudget]);
  const active = useMemo(() => buildGeometry(model.edges, model, true, segmentBudget), [model, segmentBudget]);
  const selectionKey = model.nodes.find((node) => node.visualState === 'selected')?.id
    ?? model.nodes.find((node) => node.visualState === 'lensActive')?.id
    ?? 'overview';

  useEffect(() => () => {
    background.dispose();
    active.dispose();
  }, [active, background]);

  useGSAP(() => {
    const material = activeMaterial.current;
    if (!material || active.getAttribute('position').count === 0) return undefined;
    material.uniforms.uReveal.value = 0;
    const tween = gsap.to(material.uniforms.uReveal, {
      value: 1.25,
      duration: 1.08,
      ease: 'power3.out',
      onUpdate: invalidate,
    });
    return () => tween.kill();
  }, { dependencies: [selectionKey, active, invalidate], revertOnUpdate: true });

  useFrame(({ clock }) => {
    if (activeMaterial.current) activeMaterial.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <lineSegments geometry={background}>
        <lineBasicMaterial vertexColors transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={active}>
        <shaderMaterial
          ref={activeMaterial}
          vertexShader={activeVertex}
          fragmentShader={activeFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
          uniforms={{ uReveal: { value: 1.25 }, uTime: { value: 0 } }}
        />
      </lineSegments>
    </group>
  );
}
