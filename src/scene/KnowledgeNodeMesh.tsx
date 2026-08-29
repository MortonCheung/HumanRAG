import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneNode, VisualState } from '../graph/types';

const STATE_SCALE: Record<VisualState, number> = { inactive: 0.58, contextual: 0.82, active: 1, selected: 1.2 };
const STATE_OPACITY: Record<VisualState, number> = { inactive: 0.055, contextual: 0.34, active: 0.86, selected: 1 };
const COLORS: Record<VisualState, string> = {
  inactive: '#202731',
  contextual: '#4d5c6c',
  active: '#aabbcb',
  selected: '#dcebff',
};

function NodeGeometry({ type }: { type: SceneNode['type'] }) {
  if (type === 'knowledge') return <octahedronGeometry args={[0.68, 0]} />;
  if (type === 'practice') return <torusGeometry args={[0.46, 0.13, 10, 24]} />;
  if (type === 'goal') return <capsuleGeometry args={[0.72, 2.9, 6, 14]} />;
  if (type === 'direction') return <capsuleGeometry args={[0.54, 1.95, 6, 14]} />;
  return <capsuleGeometry args={[0.4, 1.18, 5, 12]} />;
}

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
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Vector3(...node.displayPosition), [node.displayPosition]);
  const targetColor = useMemo(() => new THREE.Color(COLORS[node.visualState]), [node.visualState]);

  useFrame((_, delta) => {
    if (!group.current || !material.current) return;
    const amount = 1 - Math.pow(0.001, delta / 0.62);
    group.current.position.lerp(target, amount);
    const scale = THREE.MathUtils.damp(group.current.scale.x, STATE_SCALE[node.visualState], 8, delta);
    group.current.scale.setScalar(scale);
    material.current.opacity = THREE.MathUtils.damp(material.current.opacity, STATE_OPACITY[node.visualState], 8, delta);
    material.current.color.lerp(targetColor, amount);
    positions.current.set(node.id, group.current.position);
  });

  const rotation: [number, number, number] = ['goal', 'direction', 'course', 'skill'].includes(node.type)
    ? [0, 0, Math.PI / 2]
    : [0, 0, 0];

  return (
    <group ref={group} position={node.displayPosition} scale={STATE_SCALE[node.visualState]}>
      <mesh
        rotation={rotation}
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
        <NodeGeometry type={node.type} />
        <meshStandardMaterial
          ref={material}
          color={COLORS[node.visualState]}
          roughness={0.68}
          metalness={0.08}
          transparent
          opacity={STATE_OPACITY[node.visualState]}
          depthWrite={node.visualState !== 'inactive'}
        />
      </mesh>

      {node.visualState === 'selected' && (
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[0.72, 0.75, 48]} />
          <meshBasicMaterial color="#9fc7ff" transparent opacity={0.72} depthWrite={false} />
        </mesh>
      )}

      {node.labelVisible && (
        <Html center position={[0, node.type === 'goal' ? 1.7 : 1.05, 0]} distanceFactor={17} zIndexRange={[5, 0]}>
          <div className={`node-label node-label--${node.type} node-label--${node.visualState}`}>
            <span>{node.name}</span>
            {(node.type === 'goal' || node.type === 'direction') && <small>{node.type === 'goal' ? '目标' : '方向'}</small>}
          </div>
        </Html>
      )}
    </group>
  );
}
