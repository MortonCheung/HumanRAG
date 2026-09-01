import { useEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneModel } from '../graph/types';

const DRAG_THRESHOLD = 7;

/**
 * 所有节点的透明命中代理。视觉点精灵只负责发光，InstancedMesh 只负责拾取，
 * 因此暗节点、远景节点和不同显卡上的点精灵都拥有一致的可点击范围。
 */
export function NodeHitField({
  model,
  onHover,
  onSelect,
}: {
  model: SceneModel;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pointerStart = useRef<{ x: number; y: number; instanceId: number } | null>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    colorWrite: false,
  }), []);

  useEffect(() => {
    const current = mesh.current;
    if (!current) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    model.nodes.forEach((node, index) => {
      position.fromArray(node.displayPosition);
      const radius = node.visualState === 'selected' ? 1.5 : node.visualState === 'dormant' ? 1.05 : 1.24;
      scale.setScalar(radius);
      matrix.compose(position, quaternion, scale);
      current.setMatrixAt(index, matrix);
    });
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
  }, [model.nodes]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const nodeId = (event: ThreeEvent<PointerEvent>) => {
    const index = event.instanceId;
    return index === undefined ? null : (model.nodes[index]?.id ?? null);
  };

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, model.nodes.length]}
      frustumCulled={false}
      renderOrder={-1}
      onPointerMove={(event) => {
        event.stopPropagation();
        onHover(nodeId(event));
      }}
      onPointerOut={() => onHover(null)}
      onPointerDown={(event) => {
        const id = event.instanceId;
        if (id === undefined) return;
        pointerStart.current = { x: event.clientX, y: event.clientY, instanceId: id };
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start || event.instanceId !== start.instanceId) return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD) return;
        const id = nodeId(event);
        if (id) onSelect(id);
      }}
    />
  );
}
