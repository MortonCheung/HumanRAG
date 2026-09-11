import { CameraControls, CameraControlsImpl, Html, QuadraticBezierLine } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { migrateV9 } from '../../domain/knowledge/migration';
import { getPointsForTree, getTree } from '../../domain/knowledge/selectors';
import { layoutCustomTree } from '../library-builder/customTreeLayout';
import { customTreeFrame } from '../library-builder/customTreeFraming';
import { toCustomEdges, toCustomNodes } from '../library/treeGraphAdapter';
import { NeuronStar } from '../../scene/NodePointField';
import { viewportFocalOffset } from '../../scene/cameraFraming';
import { useSpatialViewport } from './SpatialViewport';
import { useSpatialStageStore, type SpatialStageMode } from './spatialStageStore';

/** The use-mode tree lives in the shared stage. Editors keep their isolated canvas. */
export function SpatialTreeScene({ mode, motionAllowed }: { mode: Extract<SpatialStageMode, 'library' | 'tree'>; motionAllowed: boolean }) {
  const treeId = useSpatialStageStore((state) => state.selectedTreeId);
  const data = useMemo(() => {
    const domain = migrateV9();
    const tree = treeId ? getTree(treeId) : undefined;
    const points = tree ? getPointsForTree(tree.id) : [];
    const ids = new Set(points.map((point) => point.id));
    // Use the formal tree layout here. Registry positions belong to Universe space.
    const nodes = toCustomNodes(points).map((node) => ({ ...node, position: undefined }));
    const edges = toCustomEdges(domain.relations, ids);
    return { tree, nodes, edges, positions: layoutCustomTree(nodes, edges) };
  }, [treeId]);
  const group = useRef<THREE.Group>(null);
  const modelOffset = useMemo(() => customTreeFrame(data.positions, 1, 1, mode === 'library').offset, [data.positions, mode]);
  const curves = useMemo(() => data.edges.map((edge) => {
    const start = data.positions.get(edge.source);
    const end = data.positions.get(edge.target);
    if (!start || !end) return null;
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mid = a.clone().lerp(b, 0.5);
    mid.z += Math.min(2.8, a.distanceTo(b) * 0.16) * (edge.relationType === 'related' ? -1 : 1);
    return { edge, start: a, end: b, mid };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)), [data.edges, data.positions]);

  useFrame((_, delta) => {
    if (!group.current || mode !== 'library' || !motionAllowed) return;
    group.current.rotation.y += delta * 0.075;
  });

  if (!data.tree) return null;
  return (
    <>
      <group ref={group} position={modelOffset}>
        {curves.map(({ edge, start, end, mid }) => (
          <QuadraticBezierLine key={edge.id} start={start} end={end} mid={mid}
            color={edge.relationType === 'hierarchy' ? '#a5c9ec' : '#809fc1'} transparent opacity={0.28} lineWidth={0.72} />
        ))}
        {data.nodes.map((node) => {
          const position = data.positions.get(node.id) ?? [node.x, node.y, node.z ?? 0];
          return <group key={node.id} position={position}>
            <NeuronStar color={node.color} />
            {mode === 'tree' && <Html center position={[0, -0.75, 0]} className="custom-tree-node-label" style={{ pointerEvents: 'none' }}><span>{node.name}</span></Html>}
          </group>;
        })}
      </group>
      <SpatialTreeCamera mode={mode} positions={data.positions} motionAllowed={motionAllowed} />
      {mode === 'library' && motionAllowed && <TreeAnimationClock />}
    </>
  );
}

function SpatialTreeCamera({ mode, positions, motionAllowed }: {
  mode: Extract<SpatialStageMode, 'library' | 'tree'>;
  positions: ReturnType<typeof layoutCustomTree>;
  motionAllowed: boolean;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const treeId = useSpatialStageStore((state) => state.selectedTreeId);
  const { camera, invalidate, size } = useThree();
  const usable = useSpatialViewport();
  useEffect(() => {
    if (!controls.current) return;
    const width = usable?.width ?? size.width;
    const height = usable?.height ?? size.height;
    const pose = customTreeFrame(positions, width, height, mode === 'library');
    void controls.current.setLookAt(...pose.position.toArray(), ...pose.target.toArray(), motionAllowed);
    const focal = viewportFocalOffset(camera as THREE.PerspectiveCamera, pose.position.distanceTo(pose.target), size.width, size.height, usable);
    void controls.current.setFocalOffset(focal.x, focal.y, 0, motionAllowed);
    invalidate();
  }, [treeId, mode, positions, motionAllowed, size.width, size.height, usable, camera, invalidate]);
  return <CameraControls ref={controls} makeDefault enabled={mode === 'tree'} minDistance={7} maxDistance={320}
    smoothTime={motionAllowed ? 0.34 : 0} draggingSmoothTime={0.08}
    mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }}
    touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }} />;
}

function TreeAnimationClock() {
  const { invalidate } = useThree();
  useEffect(() => {
    const timer = window.setInterval(invalidate, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [invalidate]);
  return null;
}
