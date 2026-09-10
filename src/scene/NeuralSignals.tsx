import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildEdgeCurve } from '../graph/curves';
import type { SceneModel } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';

const vertexShader = `
  attribute float aSize; attribute float aAlpha;
  varying vec3 vColor; varying float vAlpha;
  uniform float uOpacity;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (260.0 / max(1.0, -mv.z)), 2.0, 13.0);
    gl_Position = projectionMatrix * mv;
    vColor = color;
    vAlpha = aAlpha;
  }
`;

const fragmentShader = `
  varying vec3 vColor; varying float vAlpha;
  uniform float uOpacity;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float distanceToCenter = length(point);
    if (distanceToCenter > 0.5) discard;
    float core = smoothstep(0.2, 0.0, distanceToCenter);
    float halo = smoothstep(0.5, 0.12, distanceToCenter) * 0.42;
    gl_FragColor = vec4(vColor, (core + halo) * uOpacity * vAlpha);
  }
`;

const TRAIL = 7;
export function signalProgress(time: number, phase: number, speed: number, trail = 0) {
  return ((phase + time * speed - trail * 0.009) % 1 + 1) % 1;
}

/** Few continuous signals, with short fading tails, attached to real prerequisite paths. */
export function NeuralSignals({ model, motionAllowed }: { model: SceneModel; motionAllowed: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const { invalidate, gl } = useThree();
  const elapsed = useRef(0);
  const interacting = useRef(false);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0.95 } }), []);
  const signalData = useMemo(() => {
    const byId = new Map(model.nodes.map((node) => [node.id, node]));
    const sourceEdges = model.edges.filter((edge) => edge.relationType === 'hierarchy' || edge.relationType === 'practice_for');
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
        color: new THREE.Color(source.domainColor).lerp(new THREE.Color('#e6f5ff'), 0.72),
        phase: index / count,
        speed: 0.10 + (index % 4) * 0.018,
      };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    // 信号属于稳定拓扑，不随悬停、选点或分支筛选重新分配。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, model.nodes.length, model.edges.length]);

  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    const positions = new Float32Array(signalData.length * TRAIL * 3);
    const colors = new Float32Array(signalData.length * TRAIL * 3);
    const sizes = new Float32Array(signalData.length * TRAIL);
    const alphas = new Float32Array(signalData.length * TRAIL);
    signalData.forEach((signal, index) => {
      for (let trail = 0; trail < TRAIL; trail++) {
        const vertex = index * TRAIL + trail;
        positions.set(signal.curve.getPointAt(signalProgress(elapsed.current, signal.phase, signal.speed, trail)).toArray(), vertex * 3);
        colors.set(signal.color.toArray(), vertex * 3);
        sizes[vertex] = (4.8 + (index % 3) * 0.8) * (1 - trail / TRAIL * 0.55);
        alphas[vertex] = Math.pow(1 - trail / TRAIL, 2);
      }
    });
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    next.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    next.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
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
    let wheelTimer: number | null = null;
    const fps = quality === 'quality' ? 25 : quality === 'balanced' ? 20 : 12;
    const schedule = () => {
      if (cancelled || document.visibilityState === 'hidden' || interacting.current) return;
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
    const pause = () => {
      interacting.current = true;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const resume = () => {
      if (!interacting.current) return;
      interacting.current = false;
      // The active clock does not jump ahead when interaction ends.
      invalidate(); schedule();
    };
    const wheel = () => {
      pause();
      if (wheelTimer !== null) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(resume, 280);
    };
    gl.domElement.addEventListener('pointerdown', pause);
    gl.domElement.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('pointerup', resume);
    window.addEventListener('pointercancel', resume);
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      if (wheelTimer !== null) window.clearTimeout(wheelTimer);
      interacting.current = false;
      gl.domElement.removeEventListener('pointerdown', pause);
      gl.domElement.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerup', resume);
      window.removeEventListener('pointercancel', resume);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [gl, invalidate, motionAllowed, quality]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const targetOpacity = motionAllowed ? 0.95 : 0;
    material.uniforms.uOpacity.value = THREE.MathUtils.damp(material.uniforms.uOpacity.value, targetOpacity, 5.2, delta);
    if (!motionAllowed || interacting.current) return;
    elapsed.current += Math.min(delta, 0.09);

    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    signalData.forEach((signal, index) => {
      for (let trail = 0; trail < TRAIL; trail++) {
        const point = signal.curve.getPointAt(signalProgress(elapsed.current, signal.phase, signal.speed, trail));
        positions.setXYZ(index * TRAIL + trail, point.x, point.y, point.z);
      }
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
        uniforms={uniforms}
      />
    </points>
  );
}
