import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { viewportFocalOffset } from '../../../scene/cameraFraming';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { useSpatialViewport } from '../../spatial/SpatialViewport';
import { GOAL_TREE_HANDOFF_MS, useGoalTreeTransitionStore } from '../../spatial/transitions/goalTreeTransitionStore';
import { buildPreviewTreeGraph, PreviewTreeGroup, type PreviewTreeGraph } from './PreviewTreeGroup';
import { buildTreePreviewAnchors } from './treePreviewLayout';
import { deriveLearningStateFromEvidence } from '../../../domain/learning/deriveLearningState';
import { useProgressStore } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';

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

let previewUniverseInstance = 0;

/** Every tree remains mounted while Library preview becomes the formal workspace. */
export function LibraryPreviewUniverseScene({ mode, motionAllowed, readOnly }: { mode: 'library' | 'tree'; motionAllowed: boolean; readOnly: boolean }) {
  const selectedTreeId = useSpatialStageStore((state) => state.selectedTreeId);
  const selectedPointId = useSpatialStageStore((state) => state.selectedTreePointId);
  const hoveredPointId = useSpatialStageStore((state) => state.hoveredTreePointId);
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const hoverPoint = useSpatialStageStore((state) => state.hoverTreePoint);
  const handoffTreeId = useGoalTreeTransitionStore((state) => state.phase === 'handoff' ? state.treeId : null);
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
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
  const learningStates = useMemo(() => new Map(domain.points.map((point) => [point.id, deriveLearningStateFromEvidence(point.id, learnerId, evidence)] as const)), [domain.points, evidence, learnerId]);
  const anchors = useMemo(() => buildTreePreviewAnchors(trees.map((tree) => tree.id)), [trees]);
  const [instanceId] = useState(() => `tree-universe-${++previewUniverseInstance}`);
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.dataset.treeUniverseInstance = instanceId;
    return () => { delete gl.domElement.dataset.treeUniverseInstance; };
  }, [gl.domElement, instanceId]);

  return (
    <>
      {graphs.map((graph) => (
        <PreviewTreeGroup
          key={graph.tree.id}
          graph={graph}
          anchor={anchors.get(graph.tree.id) ?? new THREE.Vector3()}
          motionAllowed={motionAllowed}
          holdRotation={graph.tree.id === handoffTreeId}
          autoRotate
          interactive={mode === 'tree' && !readOnly && graph.tree.id === selectedTreeId}
          reportRotation={graph.tree.id === selectedTreeId}
          selectedPointId={graph.tree.id === selectedTreeId ? selectedPointId : null}
          hoveredPointId={graph.tree.id === selectedTreeId ? hoveredPointId : null}
          onSelectPoint={selectPoint}
          onHoverPoint={hoverPoint}
          learningStates={learningStates}
        />
      ))}
      <LibraryPreviewCamera
        mode={mode}
        selectedTreeId={selectedTreeId}
        graphs={graphs}
        anchors={anchors}
        motionAllowed={motionAllowed}
        readOnly={readOnly}
        handoff={mode === 'library' && Boolean(handoffTreeId && selectedTreeId === handoffTreeId)}
      />
      <LibraryPreviewClip />
      {motionAllowed && <PreviewAnimationClock />}
    </>
  );
}

function LibraryPreviewCamera({ mode, selectedTreeId, graphs, anchors, motionAllowed, readOnly, handoff }: {
  mode: 'library' | 'tree';
  selectedTreeId: string | null;
  graphs: PreviewTreeGraph[];
  anchors: ReadonlyMap<string, THREE.Vector3>;
  motionAllowed: boolean;
  readOnly: boolean;
  handoff: boolean;
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
    const pose = customTreeFrame(graph.positions, width, height, mode === 'library');
    if (mode === 'library' && width < 520) {
      pose.position.sub(pose.target).multiplyScalar(1.28).add(pose.target);
    } else if (mode === 'tree') {
      // The formal workspace gives the tree the whole left stage; use that space.
      pose.position.sub(pose.target).multiplyScalar(0.72).add(pose.target);
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
    gl.domElement.dataset.treeSceneMode = mode;
    gl.domElement.dataset.previewTreeId = graph.tree.id;
    if (!initialized.current && handoff && motionAllowed) {
      initialized.current = true;
      Object.assign(state.current, {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        tx: anchor.x,
        ty: anchor.y,
        tz: anchor.z,
        fx: 0,
        fy: 0,
      });
      applyCameraState();
      tween.current = gsap.timeline().to(state.current, {
        ...target,
        duration: GOAL_TREE_HANDOFF_MS / 1000,
        ease: 'power3.inOut',
        onUpdate: applyCameraState,
      });
      return () => { tween.current?.kill(); };
    }
    if (!initialized.current || !motionAllowed) {
      initialized.current = true;
      Object.assign(state.current, target);
      applyCameraState();
      return;
    }
    tween.current = gsap.timeline().to(state.current, {
      ...target,
      duration: mode === 'tree' ? 0.62 : 0.78,
      ease: 'power3.out',
      onUpdate: applyCameraState,
    });
    return () => { tween.current?.kill(); };
  }, [mode, selectedTreeId, graphs, anchors, motionAllowed, handoff, usable, size.width, size.height, camera, gl.domElement, applyCameraState]);

  useEffect(() => () => {
    tween.current?.kill();
    delete gl.domElement.dataset.previewCamera;
    delete gl.domElement.dataset.previewTreeId;
    delete gl.domElement.dataset.treeSceneMode;
  }, [gl.domElement]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={mode === 'tree' && !readOnly}
      minDistance={7}
      maxDistance={320}
      smoothTime={mode === 'tree' && motionAllowed ? 0.34 : 0}
      draggingSmoothTime={0.08}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }}
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
