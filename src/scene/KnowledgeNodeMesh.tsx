import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneNode, VisualState } from '../graph/types';
import { HOT_CORE } from '../design/domainPalette';

const STATE_SCALE: Record<VisualState, number> = {
  dormant: 0.62,
  contextual: 0.72,
  lensActive: 0.98,
  upstream: 1.02,
  downstream: 1.02,
  lateral: 0.88,
  selected: 1.16,
  recommendedPath: 1.02,
  searchMatch: 1.12,
};

const STATE_OPACITY: Record<VisualState, number> = {
  dormant: 0.13,
  contextual: 0.37,
  lensActive: 0.78,
  upstream: 0.92,
  downstream: 0.92,
  lateral: 0.6,
  selected: 1,
  recommendedPath: 0.9,
  searchMatch: 1,
};

export function KnowledgeNodeMesh({
  node,
  positions,
  onHover,
  onSelect,
}: {
  node: SceneNode;
  positions: React.MutableRefObject<Map<string, THREE.Vector3>>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshBasicMaterial>(null);
  const membrane = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(() => new THREE.Vector3(...node.displayPosition), [node.displayPosition]);
  const domain = useMemo(() => new THREE.Color(node.domainColor), [node.domainColor]);
  const hot = useMemo(() => new THREE.Color(HOT_CORE), []);

  useFrame(({ clock }, delta) => {
    if (!group.current || !core.current || !membrane.current || !halo.current) return;
    const settle = 1 - Math.pow(0.001, delta / 0.58);
    group.current.position.lerp(target, settle);
    const beat = node.visualState === 'selected'
      ? 1 + Math.sin(clock.elapsedTime * 6.2) * 0.09
      : node.visualState === 'upstream' || node.visualState === 'downstream'
        ? 1 + Math.sin(clock.elapsedTime * 4.4 - node.propagationDelay * 8) * 0.045
        : 1 + Math.sin(clock.elapsedTime * 1.35 + node.propagationDelay * 2) * 0.014;
    const scale = THREE.MathUtils.damp(group.current.scale.x, STATE_SCALE[node.visualState] * beat, 8, delta);
    group.current.scale.setScalar(scale);
    const active = ['selected', 'upstream', 'downstream', 'recommendedPath', 'searchMatch'].includes(node.visualState);
    core.current.color.copy(active ? hot : domain);
    membrane.current.color.copy(domain);
    halo.current.color.copy(active ? hot : domain);
    core.current.opacity = THREE.MathUtils.damp(core.current.opacity, STATE_OPACITY[node.visualState], 10, delta);
    membrane.current.opacity = THREE.MathUtils.damp(membrane.current.opacity, STATE_OPACITY[node.visualState] * 0.42, 10, delta);
    halo.current.opacity = THREE.MathUtils.damp(halo.current.opacity, Math.min(0.16, node.luminance * 0.13), 10, delta);
    positions.current.set(node.id, group.current.position);
  });

  return (
    <group ref={group} position={node.displayPosition}>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(node.id);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          document.body.style.cursor = '';
          onHover(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        <sphereGeometry args={[node.coreRadius, 18, 18]} />
        <meshBasicMaterial ref={core} color={node.domainColor} transparent opacity={STATE_OPACITY[node.visualState]} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={1.52} raycast={() => null}>
        <sphereGeometry args={[node.coreRadius, 16, 16]} />
        <meshBasicMaterial ref={membrane} color={node.domainColor} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh scale={node.haloRadius / Math.max(node.coreRadius, 0.01)} raycast={() => null}>
        <sphereGeometry args={[node.coreRadius, 14, 14]} />
        <meshBasicMaterial ref={halo} color={node.domainColor} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {node.visualState === 'selected' && (
        <mesh rotation-x={Math.PI / 2} raycast={() => null}>
          <ringGeometry args={[node.coreRadius * 1.9, node.coreRadius * 2.02, 48]} />
          <meshBasicMaterial color={HOT_CORE} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {node.labelVisible && (
        <Html center position={[0, node.coreRadius * 3.4, 0]} distanceFactor={18} zIndexRange={[5, 0]}>
          <div className={`node-label node-label--${node.visualState}`}>
            <span>{node.name}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
