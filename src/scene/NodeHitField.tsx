import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
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
  const targets = useRef(model.nodes.map((node) => new THREE.Vector3(...node.displayPosition)));
  const currentPositions = useRef(model.nodes.map((node) => new THREE.Vector3(...node.displayPosition)));
  const moving = useRef(false);
  const { camera, gl, invalidate } = useThree();
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    colorWrite: false,
  }), []);

  useEffect(() => {
    targets.current = model.nodes.map((node, index) => {
      const target = new THREE.Vector3(...node.displayPosition);
      if (!currentPositions.current[index]) currentPositions.current[index] = target.clone();
      if (currentPositions.current[index].distanceToSquared(target) > 0.0001) moving.current = true;
      return target;
    });
    invalidate();
  }, [invalidate, model.nodes]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const nodeId = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    const rect = gl.domElement.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const projected = new THREE.Vector3();
    let bestIndex = event.instanceId;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const intersection of event.intersections) {
      if (intersection.object !== mesh.current || intersection.instanceId === undefined) continue;
      const position = currentPositions.current[intersection.instanceId];
      if (!position) continue;
      projected.copy(position).project(camera);
      const screenX = (projected.x * 0.5 + 0.5) * rect.width;
      const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
      const distance = Math.hypot(screenX - pointerX, screenY - pointerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = intersection.instanceId;
      }
    }
    const index = bestIndex;
    return index === undefined ? null : (model.nodes[index]?.id ?? null);
  };

  useFrame((_, delta) => {
    const current = mesh.current;
    if (!current) return;
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 5.4);
    let maxDelta = 0;
    model.nodes.forEach((node, index) => {
      const position = currentPositions.current[index];
      const target = targets.current[index] ?? position;
      if (moving.current) {
        maxDelta = Math.max(maxDelta, position.distanceTo(target));
        position.lerp(target, alpha);
      }
      // 命中体紧贴光点，避免密集区域中前方的大球抢走后方节点。
      const radius = node.visualState === 'selected' ? 1.05 : node.visualState === 'dormant' ? 0.62 : 0.82;
      scale.setScalar(radius);
      matrix.compose(position, quaternion, scale);
      current.setMatrixAt(index, matrix);
    });
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
    if (moving.current) {
      if (maxDelta < 0.012) moving.current = false;
      else invalidate();
    }
  });

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
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(nodeId(event));
      }}
      onPointerOut={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta > DRAG_THRESHOLD) return;
        const id = nodeId(event);
        if (id) onSelect(id);
      }}
    />
  );
}
