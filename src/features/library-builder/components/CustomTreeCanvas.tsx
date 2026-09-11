import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraControls, CameraControlsImpl, Html, PerspectiveCamera, QuadraticBezierLine, type QuadraticBezierLineRef } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { CustomEdge, CustomNode } from '../../../store/libraryStore';
import { layoutCustomTree, reconcileTreePositions, type TreePositionMap } from '../customTreeLayout';
import { customTreeFrame } from '../customTreeFraming';
import { NeuronStar } from '../../../scene/NodePointField';

const EMPTY_EDGES: CustomEdge[] = [];
// One small in-memory snapshot per visited tree; no persisted layout or second scene store.
const treeViews = new Map<string, { camera: string; offset: [number, number, number]; scale: number }>();

interface CustomTreeCanvasProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  selectedId: string | null;
  connectSource?: string | null;
  previewNode?: CustomNode | null;
  previewEdges?: CustomEdge[];
  interactive?: boolean;
  autoRotate?: boolean;
  movableIds?: readonly string[];
  viewKey?: string;
  onSelect?: (id: string) => boolean | void;
  onHover?: (id: string | null) => void;
  onConnectTarget?: (id: string) => void;
  onMove?: (id: string, position: [number, number, number]) => void;
}

export function CustomTreeCanvas({
  nodes,
  edges,
  selectedId,
  connectSource = null,
  previewNode = null,
  previewEdges = EMPTY_EDGES,
  interactive = true,
  autoRotate = false,
  onSelect,
  onHover,
  onConnectTarget,
  onMove,
  movableIds,
  viewKey,
}: CustomTreeCanvasProps) {
  const allNodes = useMemo(() => previewNode && !nodes.some((node) => node.id === previewNode.id) ? [...nodes, previewNode] : nodes, [nodes, previewNode]);
  const allEdges = useMemo(() => [...edges, ...previewEdges], [edges, previewEdges]);
  return (
    <div className="custom-tree-canvas" aria-label={`个人三维知识树，共 ${allNodes.length} 个节点`}>
      <Canvas frameloop="demand" dpr={[0.65, 1.25]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}>
        <PerspectiveCamera makeDefault fov={46} near={0.1} far={420} position={[22, 18, 28]} />
        <color attach="background" args={['#080a10']} />
        <fog attach="fog" args={['#080a10', autoRotate ? 100 : 65, autoRotate ? 320 : 180]} />
        <TreeScene
          nodes={allNodes}
          edges={allEdges}
          selectedId={selectedId}
          connectSource={connectSource}
          interactive={interactive}
          autoRotate={autoRotate}
          onSelect={onSelect}
          onHover={onHover}
          onConnectTarget={onConnectTarget}
          onMove={onMove}
          movableIds={movableIds}
          viewKey={viewKey}
        />
      </Canvas>
    </div>
  );
}

function TreeScene({ nodes, edges, selectedId, connectSource, interactive, autoRotate, onSelect, onHover, onConnectTarget, onMove, movableIds, viewKey }: Required<Pick<CustomTreeCanvasProps, 'nodes' | 'edges' | 'selectedId' | 'connectSource' | 'interactive' | 'autoRotate'>> & Pick<CustomTreeCanvasProps, 'onSelect' | 'onHover' | 'onConnectTarget' | 'onMove' | 'movableIds' | 'viewKey'>) {
  const controls = useRef<CameraControlsImpl>(null);
  const treeGroup = useRef<THREE.Group>(null);
  const basePositions = useMemo(() => layoutCustomTree(nodes, edges), [edges, nodes]);
  const [positions, setPositions] = useState<TreePositionMap>(() => new Map(basePositions));
  const positionsRef = useRef(positions);
  const previousBase = useRef(basePositions);
  const nodeGroups = useRef(new Map<string, THREE.Group>());
  const edgeLines = useRef(new Map<string, QuadraticBezierLineRef>());
  const [dragging, setDragging] = useState(false);
  const { camera, invalidate, size } = useThree();
  const drag = useRef<{
    id: string;
    plane: THREE.Plane;
    offset: THREE.Vector3;
    moved: boolean;
    pointerId: number;
    start: [number, number, number];
    screenStart: [number, number];
    release: () => void;
  } | null>(null);

  useEffect(() => {
    const next = reconcileTreePositions(positionsRef.current, previousBase.current, basePositions, drag.current?.id, new Set(nodes.filter((node) => node.position).map((node) => node.id)));
    previousBase.current = basePositions;
    positionsRef.current = next;
    setPositions(next);
  }, [basePositions, nodes]);

  const fitPositions = useRef(basePositions);
  fitPositions.current = basePositions;
  const viewport = useRef(size);
  viewport.current = size;

  useEffect(() => {
    let frame = 0;
    const fit = () => {
      if (!treeGroup.current || !controls.current) {
        frame = window.requestAnimationFrame(fit);
        return;
      }
      const saved = viewKey && !autoRotate ? treeViews.get(viewKey) : undefined;
      if (saved && controls.current) {
        treeGroup.current.position.set(...saved.offset);
        treeGroup.current.scale.setScalar(saved.scale);
        void controls.current.fromJSON(saved.camera, false);
        invalidate();
        return;
      }
      const pose = customTreeFrame(fitPositions.current, viewport.current.width, viewport.current.height, autoRotate);
      treeGroup.current.scale.setScalar(1);
      treeGroup.current.position.copy(pose.offset);
      treeGroup.current.rotation.set(0, 0, 0);
      // Disabled controls still update their camera: use the same owner for previews and editors.
      void controls.current.setLookAt(...pose.position.toArray(), ...pose.target.toArray(), false);
      invalidate();
    };
    fit();
    return () => window.cancelAnimationFrame(frame);
  }, [autoRotate, camera, invalidate, viewKey]);

  useEffect(() => {
    const instance = controls.current;
    const group = treeGroup.current;
    if (!instance || !group || !viewKey || autoRotate) return;
    const remember = () => {
      treeViews.set(viewKey, { camera: instance.toJSON(), offset: group.position.toArray() as [number, number, number], scale: group.scale.x });
      if (treeViews.size > 16) treeViews.delete(treeViews.keys().next().value!);
    };
    instance.addEventListener('rest', remember);
    return () => { remember(); instance.removeEventListener('rest', remember); };
  }, [autoRotate, viewKey]);

  useFrame((_, delta) => {
    if (!autoRotate || dragging || !treeGroup.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Orbit the framed target, not the uncentred model origin.
    void controls.current?.rotate(delta * 0.075, 0, false);
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
    return { edge, start: a, end: b, mid };
  }).filter((item): item is NonNullable<typeof item> => item !== null), [edges, positions]);

  function pointerDown(event: ThreeEvent<PointerEvent>, id: string) {
    if (!interactive || event.button !== 0) return;
    event.stopPropagation();
    if (drag.current) return;
    if (!connectSource && onSelect?.(id) === false) return;
    if (!onMove || (movableIds && !movableIds.includes(id)) || connectSource) return;
    onHover?.(null);
    const position = positionsRef.current.get(id);
    if (!position) return;
    const worldPosition = treeGroup.current?.localToWorld(new THREE.Vector3(...position));
    if (!worldPosition) return;
    const normal = new THREE.Vector3();
    event.camera.getWorldDirection(normal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, worldPosition);
    const intersection = new THREE.Vector3();
    if (!event.ray.intersectPlane(plane, intersection)) return;
    const target = event.target as unknown as { setPointerCapture?: (pointerId: number) => void; releasePointerCapture?: (pointerId: number) => void };
    drag.current = { id, plane, offset: intersection.sub(worldPosition), moved: false, pointerId: event.pointerId, start: [...position], screenStart: [event.clientX, event.clientY], release: () => target.releasePointerCapture?.(event.pointerId) };
    setDragging(true);
    if (controls.current) controls.current.enabled = false;
    target.setPointerCapture?.(event.pointerId);
  }

  function previewPosition(id: string, position: [number, number, number]) {
    positionsRef.current.set(id, position);
    nodeGroups.current.get(id)?.position.set(...position);
    for (const edge of edges) {
      if (edge.source !== id && edge.target !== id) continue;
      const start = positionsRef.current.get(edge.source);
      const end = positionsRef.current.get(edge.target);
      if (!start || !end) continue;
      const a = new THREE.Vector3(...start);
      const b = new THREE.Vector3(...end);
      const mid = a.clone().lerp(b, 0.5);
      mid.z += Math.min(2.8, a.distanceTo(b) * 0.16) * (edge.relationType === 'related' ? -1 : 1);
      edgeLines.current.get(edge.id)?.setPoints(a, b, mid);
    }
    invalidate();
  }

  function pointerMove(event: ThreeEvent<PointerEvent>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (!active.moved && Math.hypot(event.clientX - active.screenStart[0], event.clientY - active.screenStart[1]) < 4) return;
    const intersection = new THREE.Vector3();
    if (!event.ray.intersectPlane(active.plane, intersection)) return;
    const next = treeGroup.current?.worldToLocal(intersection.sub(active.offset));
    if (!next || ![next.x, next.y, next.z].every(Number.isFinite)) return;
    active.moved = true;
    previewPosition(active.id, [next.x, next.y, next.z]);
  }

  function finishDrag(cancelled: boolean) {
    const active = drag.current;
    if (!active) return;
    drag.current = null;
    if (cancelled) previewPosition(active.id, active.start);
    const position = positionsRef.current.get(active.id);
    positionsRef.current = new Map(positionsRef.current);
    setPositions(positionsRef.current);
    setDragging(false);
    if (controls.current) controls.current.enabled = interactive;
    document.body.style.cursor = '';
    onHover?.(null);
    try { active.release(); } catch { /* Capture may already be released by the browser. */ }
    if (!cancelled && active.moved && position) onMove?.(active.id, position);
  }

  useEffect(() => () => {
    const active = drag.current;
    drag.current = null;
    try { active?.release(); } catch { /* The canvas may already have been detached. */ }
    if (controls.current) controls.current.enabled = interactive;
    document.body.style.cursor = '';
  }, []);

  function pointerUp(event: ThreeEvent<PointerEvent>, id: string) {
    if (!interactive) return;
    event.stopPropagation();
    const active = drag.current;
    if (active && active.pointerId !== event.pointerId) return;
    finishDrag(false);
    if (active) return;
    if (connectSource && connectSource !== id) onConnectTarget?.(id);
    else onSelect?.(id);
  }

  return (
    <>
      <group ref={treeGroup}>
        {curves.map(({ edge, start, end, mid }) => (
          <QuadraticBezierLine
            ref={(line) => { if (line) edgeLines.current.set(edge.id, line); else edgeLines.current.delete(edge.id); }}
            key={edge.id}
            start={start}
            end={end}
            mid={mid}
            color={edge.relationType === 'hierarchy' ? '#a5c9ec' : '#809fc1'}
            transparent
            opacity={connectSource && (edge.source === connectSource || edge.target === connectSource) ? 0.82 : 0.3}
            lineWidth={connectSource && (edge.source === connectSource || edge.target === connectSource) ? 1.35 : 0.72}
          />
        ))}
        {nodes.map((node) => {
          const position = positions.get(node.id) ?? [node.x, node.y, node.z ?? 0];
          const selected = node.id === selectedId;
          const source = node.id === connectSource;
          return (
            <group key={node.id} position={position} ref={(group) => { if (group) nodeGroups.current.set(node.id, group); else nodeGroups.current.delete(node.id); }}>
              <NeuronStar color={node.color} selected={selected || source} />
              <mesh
                onPointerDown={(event) => pointerDown(event, node.id)}
                onPointerMove={pointerMove}
                onPointerUp={(event) => pointerUp(event, node.id)}
                onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) finishDrag(true); }}
                onLostPointerCapture={(event) => { if (drag.current?.pointerId === event.pointerId) finishDrag(true); }}
                onPointerOver={(event) => { if (interactive && !drag.current) { event.stopPropagation(); document.body.style.cursor = onMove ? 'grab' : 'pointer'; onHover?.(node.id); } }}
                onPointerOut={() => { if (interactive && !drag.current) { document.body.style.cursor = ''; onHover?.(null); } }}
              >
                <sphereGeometry args={[selected || source ? 0.58 : 0.44, 8, 6]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
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
      {autoRotate && !dragging && <TreeAnimationClock />}
      <CameraControls
        ref={controls}
        makeDefault
        enabled={interactive && !dragging}
        minDistance={7}
        maxDistance={autoRotate ? 360 : 78}
        smoothTime={0.5}
        draggingSmoothTime={0.08}
        mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }}
        touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }}
      />
    </>
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
