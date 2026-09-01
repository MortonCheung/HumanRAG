import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraControls, CameraControlsImpl, Html, PerspectiveCamera, QuadraticBezierLine } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { CustomEdge, CustomNode } from '../../../store/libraryStore';
import { layoutCustomTree, type TreePositionMap } from '../customTreeLayout';

interface CustomTreeCanvasProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedId: string | null;
  connectSource?: string | null;
  previewNode?: CustomNode | null;
  previewEdges?: CustomEdge[];
  interactive?: boolean;
  autoRotate?: boolean;
  onSelect?: (id: string) => void;
  onConnectTarget?: (id: string) => void;
  onMove?: (id: string, position: [number, number, number]) => void;
}

export function CustomTreeCanvas({
  nodes,
  edges,
  selectedId,
  connectSource = null,
  previewNode = null,
  previewEdges = [],
  interactive = true,
  autoRotate = false,
  onSelect,
  onConnectTarget,
  onMove,
}: CustomTreeCanvasProps) {
  const allNodes = useMemo(() => previewNode && !nodes.some((node) => node.id === previewNode.id) ? [...nodes, previewNode] : nodes, [nodes, previewNode]);
  const allEdges = useMemo(() => [...edges, ...previewEdges], [edges, previewEdges]);
  return (
    <div className="custom-tree-canvas" aria-label={`个人三维知识树，共 ${allNodes.length} 个节点`}>
      <Canvas frameloop="demand" dpr={[0.65, 1.25]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}>
        <PerspectiveCamera makeDefault fov={46} near={0.1} far={220} position={[22, 18, 28]} />
        <color attach="background" args={['#040606']} />
        <fog attach="fog" args={['#040606', 38, 100]} />
        <TreeScene
          nodes={allNodes}
          edges={allEdges}
          selectedId={selectedId}
          connectSource={connectSource}
          interactive={interactive}
          autoRotate={autoRotate}
          onSelect={onSelect}
          onConnectTarget={onConnectTarget}
          onMove={onMove}
        />
        <TreeAnimationClock />
      </Canvas>
    </div>
  );
}

function TreeScene({ nodes, edges, selectedId, connectSource, interactive, autoRotate, onSelect, onConnectTarget, onMove }: Required<Pick<CustomTreeCanvasProps, 'nodes' | 'edges' | 'selectedId' | 'connectSource' | 'interactive' | 'autoRotate'>> & Pick<CustomTreeCanvasProps, 'onSelect' | 'onConnectTarget' | 'onMove'>) {
  const controls = useRef<CameraControlsImpl>(null);
  const treeGroup = useRef<THREE.Group>(null);
  const basePositions = useMemo(() => layoutCustomTree(nodes, edges), [edges, nodes]);
  const [positions, setPositions] = useState<TreePositionMap>(basePositions);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    id: string;
    plane: THREE.Plane;
    offset: THREE.Vector3;
    moved: boolean;
  } | null>(null);

  useEffect(() => setPositions(basePositions), [basePositions]);

  useFrame((_, delta) => {
    if (!autoRotate || dragging || !treeGroup.current) return;
    treeGroup.current.rotation.y += delta * 0.075;
  });

  const curves = useMemo(() => edges.map((edge) => {
    const start = positions.get(edge.source);
    const end = positions.get(edge.target);
    if (!start || !end) return null;
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mid = a.clone().lerp(b, 0.5);
    const distance = a.distanceTo(b);
    mid.z += Math.min(2.8, distance * 0.16) * (edge.relationType === 'related' ? -1 : 1);
    return { edge, start: a, end: b, mid, curve: new THREE.QuadraticBezierCurve3(a, mid, b) };
  }).filter((item): item is NonNullable<typeof item> => item !== null), [edges, positions]);

  function pointerDown(event: ThreeEvent<PointerEvent>, id: string) {
    if (!interactive) return;
    event.stopPropagation();
    const position = positions.get(id);
    if (!position) return;
    if (!connectSource) onSelect?.(id);
    const normal = new THREE.Vector3();
    event.camera.getWorldDirection(normal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(...position));
    const intersection = new THREE.Vector3();
    if (!event.ray.intersectPlane(plane, intersection)) return;
    drag.current = { id, plane, offset: intersection.sub(new THREE.Vector3(...position)), moved: false };
    setDragging(true);
    (event.target as unknown as { setPointerCapture?: (pointerId: number) => void }).setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event: ThreeEvent<PointerEvent>) {
    const active = drag.current;
    if (!active) return;
    event.stopPropagation();
    const intersection = new THREE.Vector3();
    if (!event.ray.intersectPlane(active.plane, intersection)) return;
    const next = intersection.sub(active.offset);
    active.moved = true;
    setPositions((current) => {
      const copy = new Map(current);
      copy.set(active.id, [next.x, next.y, next.z]);
      return copy;
    });
  }

  function pointerUp(event: ThreeEvent<PointerEvent>, id: string) {
    if (!interactive) return;
    const active = drag.current;
    drag.current = null;
    setDragging(false);
    if (active?.moved) {
      const position = positions.get(active.id);
      if (position) onMove?.(active.id, position);
      return;
    }
    if (connectSource && connectSource !== id) onConnectTarget?.(id);
    else onSelect?.(id);
  }

  return (
    <>
      <group ref={treeGroup}>
        {curves.map(({ edge, start, end, mid }) => (
          <QuadraticBezierLine
            key={edge.id}
            start={start}
            end={end}
            mid={mid}
            color={edge.relationType === 'hierarchy' ? '#667878' : '#8a7756'}
            transparent
            opacity={connectSource && (edge.source === connectSource || edge.target === connectSource) ? 0.82 : 0.3}
            lineWidth={connectSource && (edge.source === connectSource || edge.target === connectSource) ? 1.35 : 0.72}
          />
        ))}
        {curves.slice(0, 7).map(({ edge, curve }, index) => <TreeSignal key={`signal-${edge.id}`} curve={curve} phase={index / 7} color={nodes.find((node) => node.id === edge.source)?.color ?? '#84abb0'} />)}
        {nodes.map((node) => {
          const position = positions.get(node.id) ?? [node.x, node.y, node.z ?? 0];
          const selected = node.id === selectedId;
          const source = node.id === connectSource;
          return (
            <group key={node.id} position={position}>
              <mesh
                onPointerDown={(event) => pointerDown(event, node.id)}
                onPointerMove={pointerMove}
                onPointerUp={(event) => pointerUp(event, node.id)}
                onPointerOver={(event) => { if (interactive) { event.stopPropagation(); document.body.style.cursor = 'grab'; } }}
                onPointerOut={() => { if (interactive && !drag.current) document.body.style.cursor = ''; }}
              >
                <sphereGeometry args={[selected || source ? 0.42 : 0.29, 18, 14]} />
                <meshBasicMaterial color={selected ? '#fff7df' : (node.color ?? '#84abb0')} toneMapped={false} />
              </mesh>
              <mesh scale={selected || source ? 1.9 : 1.55}>
                <sphereGeometry args={[0.42, 14, 10]} />
                <meshBasicMaterial color={node.color ?? '#84abb0'} transparent opacity={selected || source ? 0.12 : 0.055} depthWrite={false} />
              </mesh>
              {(selected || source) && (
                <Html center position={[0, -0.85, 0]} className="custom-tree-node-label" style={{ pointerEvents: 'none' }}>
                  <span>{node.name}</span>
                </Html>
              )}
            </group>
          );
        })}
      </group>
      <CameraControls
        ref={controls}
        makeDefault
        enabled={interactive && !dragging}
        minDistance={7}
        maxDistance={78}
        smoothTime={0.5}
        draggingSmoothTime={0.08}
        mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }}
        touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }}
      />
    </>
  );
}

function TreeSignal({ curve, phase, color }: { curve: THREE.QuadraticBezierCurve3; phase: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const point = curve.getPointAt((phase + clock.elapsedTime * 0.065) % 1);
    ref.current?.position.copy(point);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09, 8, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** 编辑器里的生命动画以 24fps 更新，避免 Windows 集显为少量信号持续跑满 60fps。 */
function TreeAnimationClock() {
  const { invalidate } = useThree();
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer: number | null = null;
    let cancelled = false;
    const tick = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      timer = window.setTimeout(() => {
        invalidate();
        tick();
      }, 1000 / 24);
    };
    const visibility = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', visibility);
    tick();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [invalidate]);
  return null;
}
