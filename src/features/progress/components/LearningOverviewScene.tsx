import { Canvas, useThree } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { buildPreviewTreeGraph, PreviewTreeGroup } from '../../library/scene/PreviewTreeGroup';
import { buildTreePreviewAnchors } from '../../library/scene/treePreviewLayout';

function OverviewCamera() {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    camera.position.set(95, 68, 205);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate]);
  return null;
}

function OverviewClock() {
  const { invalidate } = useThree();
  useEffect(() => {
    const timer = window.setInterval(invalidate, 1000 / 22);
    return () => window.clearInterval(timer);
  }, [invalidate]);
  return null;
}

export function LearningOverviewScene() {
  const reducedMotion = Boolean(useReducedMotion());
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const motionAllowed = !reducedMotion && visible;
  const { graphs, anchors } = useMemo(() => {
    const domain = migrateV9();
    const pointsById = new Map(domain.points.map((point) => [point.id, point]));
    const trees = domain.trees.filter((tree) => tree.ownerType === 'system' && domain.library.treeIds.includes(tree.id));
    const nextGraphs = trees.map((tree) => buildPreviewTreeGraph(
      tree,
      tree.pointIds.flatMap((pointId) => {
        const point = pointsById.get(pointId);
        return point ? [point] : [];
      }),
      domain.relations,
    ));
    return {
      graphs: nextGraphs,
      anchors: buildTreePreviewAnchors(trees.map((tree) => tree.id)),
    };
  }, []);

  return <div className="learning-overview-scene" role="img" aria-label="计算机知识库四棵知识树的整体学习空间">
    <Canvas
      frameloop="demand"
      dpr={[1, 1.25]}
      camera={{ fov: 44, near: 0.1, far: 500 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => { gl.domElement.style.pointerEvents = 'none'; }}
    >
      <OverviewCamera />
      <group scale={0.42}>
        {graphs.map((graph) => <PreviewTreeGroup
          key={graph.tree.id}
          graph={graph}
          anchor={(anchors.get(graph.tree.id) ?? new THREE.Vector3()).clone().multiplyScalar(0.405)}
          motionAllowed={motionAllowed}
          autoRotate
          interactive={false}
        />)}
      </group>
      {motionAllowed && <OverviewClock />}
    </Canvas>
  </div>;
}
