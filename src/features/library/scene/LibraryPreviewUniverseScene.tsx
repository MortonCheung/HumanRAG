import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { viewportFocalOffset } from '../../../scene/cameraFraming';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { useSpatialViewport } from '../../spatial/SpatialViewport';
import { buildPreviewTreeGraph, PreviewTreeGroup, type PreviewTreeGraph } from './PreviewTreeGroup';
import { buildTreePreviewAnchors } from './treePreviewLayout';

interface PreviewCameraState {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  fx: number;
  fy: number;
}

/** Every library tree remains mounted; selection changes only the shared camera target. */
export function LibraryPreviewUniverseScene({ motionAllowed }: { motionAllowed: boolean }) {
  const selectedTreeId = useSpatialStageStore((state) => state.selectedTreeId);
  const domain = useMemo(() => migrateV9(), []);
  const pointsById = useMemo(() => new Map(domain.points.map((point) => [point.id, point])), [domain.points]);
  const trees = useMemo(() => {
    const treeById = new Map([...domain.trees, ...domain.userTrees].map((tree) => [tree.id, tree]));
    return domain.library.treeIds.map((treeId) => treeById.get(treeId)).filter((tree): tree is NonNullable<typeof tree> => Boolean(tree));
  }, [domain.library.treeIds, domain.trees, domain.userTrees]);
  const graphs = useMemo(() => trees.map((tree) => buildPreviewTreeGraph(
    tree,
    tree.pointIds.map((pointId) => pointsById.get(pointId)).filter((point): point is NonNullable<typeof point> => Boolean(point)),
    domain.relations,
  )), [domain.relations, pointsById, trees]);
  const anchors = useMemo(() => buildTreePreviewAnchors(trees.map((tree) => tree.id)), [trees]);

  return (
    <>
      {graphs.map((graph) => (
        <PreviewTreeGroup
          key={graph.tree.id}
          graph={graph}
          anchor={anchors.get(graph.tree.id) ?? new THREE.Vector3()}
          motionAllowed={motionAllowed}
        />
      ))}
      <LibraryPreviewCamera
        selectedTreeId={selectedTreeId}
        graphs={graphs}
        anchors={anchors}
        motionAllowed={motionAllowed}
      />
      <LibraryPreviewClip />
      {motionAllowed && <PreviewAnimationClock />}
    </>
  );
}

function LibraryPreviewCamera({ selectedTreeId, graphs, anchors, motionAllowed }: {
  selectedTreeId: string | null;
  graphs: PreviewTreeGraph[];
  anchors: ReadonlyMap<string, THREE.Vector3>;
  motionAllowed: boolean;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const tween = useRef<gsap.core.Timeline | null>(null);
  const state = useRef<PreviewCameraState>({ x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 0, fx: 0, fy: 0 });
  const initialized = useRef(false);
  const { camera, gl, invalidate, size } = useThree();
  const usable = useSpatialViewport();

  const applyCameraState = useCallback(() => {
    const current = state.current;
    void controls.current?.setLookAt(current.x, current.y, current.z, current.tx, current.ty, current.tz, false);
    void controls.current?.setFocalOffset(current.fx, current.fy, 0, false);
    gl.domElement.dataset.previewCamera = [current.x, current.y, current.z, current.tx, current.ty, current.tz]
      .map((value) => value.toFixed(3)).join(',');
    invalidate();
  }, [gl.domElement, invalidate]);

  useEffect(() => {
    const graph = graphs.find((candidate) => candidate.tree.id === selectedTreeId) ?? graphs[0];
    if (!graph || !controls.current) return;
    const anchor = anchors.get(graph.tree.id) ?? new THREE.Vector3();
    const width = usable?.width ?? size.width;
    const height = usable?.height ?? size.height;
    const pose = customTreeFrame(graph.positions, width, height, true);
    if (width < 520) {
      pose.position.sub(pose.target).multiplyScalar(1.28).add(pose.target);
    }
    pose.position.add(anchor);
    pose.target.add(anchor);
    const focal = viewportFocalOffset(
      camera as THREE.PerspectiveCamera,
      pose.position.distanceTo(pose.target),
      size.width,
      size.height,
      usable,
    );
    const target: PreviewCameraState = {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z,
      tx: pose.target.x,
      ty: pose.target.y,
      tz: pose.target.z,
      fx: focal.x,
      fy: focal.y,
    };
    tween.current?.kill();
    gl.domElement.dataset.previewTreeId = graph.tree.id;
    if (!initialized.current || !motionAllowed) {
      initialized.current = true;
      Object.assign(state.current, target);
      applyCameraState();
      return;
    }
    tween.current = gsap.timeline().to(state.current, {
      ...target,
      duration: 0.78,
      ease: 'power3.out',
      onUpdate: applyCameraState,
    });
    return () => { tween.current?.kill(); };
  }, [selectedTreeId, graphs, anchors, motionAllowed, usable, size.width, size.height, camera, gl.domElement, applyCameraState]);

  useEffect(() => () => {
    tween.current?.kill();
    delete gl.domElement.dataset.previewCamera;
    delete gl.domElement.dataset.previewTreeId;
  }, [gl.domElement]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={false}
      minDistance={7}
      maxDistance={320}
      smoothTime={0}
    />
  );
}

/** The shared Canvas spans the app; Library renders only inside its measured preview window. */
function LibraryPreviewClip() {
  const { gl, invalidate, size } = useThree();
  const usable = useSpatialViewport();
  useEffect(() => {
    gl.setScissorTest(false);
    gl.clear(true, true, true);
    if (usable) {
      gl.setScissor(
        usable.left,
        size.height - usable.top - usable.height,
        usable.width,
        usable.height,
      );
      gl.setScissorTest(true);
    }
    invalidate();
    return () => {
      gl.setScissorTest(false);
      gl.setScissor(0, 0, size.width, size.height);
    };
  }, [gl, invalidate, size.height, size.width, usable]);
  return null;
}

function PreviewAnimationClock() {
  const { invalidate } = useThree();
  useEffect(() => {
    const timer = window.setInterval(invalidate, 1000 / 24);
    return () => window.clearInterval(timer);
  }, [invalidate]);
  return null;
}
