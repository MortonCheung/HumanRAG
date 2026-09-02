import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildEdgeCurve } from '../graph/curves';
import type { SceneModel } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';

const vertexShader = `
  attribute float aSize;
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (260.0 / max(1.0, -mv.z)), 2.0, 13.0);
    gl_Position = projectionMatrix * mv;
    vColor = color;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float distanceToCenter = length(point);
    if (distanceToCenter > 0.5) discard;
    float core = smoothstep(0.2, 0.0, distanceToCenter);
    float halo = smoothstep(0.5, 0.12, distanceToCenter) * 0.42;
    gl_FragColor = vec4(vColor, (core + halo) * uOpacity);
  }
`;

/** 少量神经信号沿真实关系曲线持续传递；不受鼠标悬停和闲置状态控制。 */
export function NeuralSignals({ model, motionAllowed }: { model: SceneModel; motionAllowed: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const { invalidate } = useThree();
  const signalData = useMemo(() => {
    const byId = new Map(model.nodes.map((node) => [node.id, node]));
    const focused = selectedGoalId
      ? model.edges.filter((edge) => {
        const source = byId.get(edge.source);
        return source && source.branchId === byId.get(selectedGoalId)?.branchId;
      })
      : model.edges;
    const sourceEdges = focused.length >= 6 ? focused : model.edges;
    const qualityCount = quality === 'quality' ? 14 : quality === 'balanced' ? 10 : 7;
    const count = Math.min(qualityCount, sourceEdges.length);
    if (!count) return [];
    return Array.from({ length: count }, (_, index) => {
      const edge = sourceEdges[Math.floor((index / count) * sourceEdges.length)];
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) return null;
      return {
        curve: buildEdgeCurve(edge, source.displayPosition, target.displayPosition),
        color: new THREE.Color(source.domainColor),
        phase: index / count,
        speed: 0.035 + (index % 4) * 0.006,
      };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    // 节点选择不会换掉正在传递的神经信号；只在树聚散或画质变化时重新分配。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, selectedGoalId]);

  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    const positions = new Float32Array(signalData.length * 3);
    const colors = new Float32Array(signalData.length * 3);
    const sizes = new Float32Array(signalData.length);
    signalData.forEach((signal, index) => {
      const point = signal.curve.getPointAt(signal.phase);
      positions.set(point.toArray(), index * 3);
      colors.set(signal.color.toArray(), index * 3);
      sizes[index] = 4.8 + (index % 3) * 0.8;
    });
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    next.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return next;
  }, [signalData]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    if (!motionAllowed) {
      invalidate();
      return undefined;
    }
    let timer: number | null = null;
    let cancelled = false;
    const fps = quality === 'quality' ? 24 : quality === 'balanced' ? 18 : 12;
    const schedule = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      timer = window.setTimeout(() => {
        invalidate();
        schedule();
      }, 1000 / fps);
    };
    const onVisibility = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [invalidate, motionAllowed, quality]);

  useFrame(({ clock }, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const targetOpacity = 0.9;
    material.uniforms.uOpacity.value = THREE.MathUtils.damp(material.uniforms.uOpacity.value, targetOpacity, 5.2, delta);
    if (!motionAllowed) return;

    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    signalData.forEach((signal, index) => {
      const progress = (signal.phase + clock.elapsedTime * signal.speed) % 1;
      const point = signal.curve.getPointAt(progress);
      positions.setXYZ(index, point.x, point.y, point.z);
    });
    positions.needsUpdate = true;
  });

  if (!signalData.length) return null;
  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        uniforms={{ uOpacity: { value: 0.9 } }}
      />
    </points>
  );
}
