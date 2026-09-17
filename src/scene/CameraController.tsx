import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type gsap from 'gsap';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';
import { applyCameraPose, frameSphereAlongView, freezeCamera, introCameraDistance, nodeFocusPose, openingSeedFocalOffset, viewportFocalOffset } from './cameraFraming';
import { createEntryShot, introOrbitDirection } from './entryShot';
import { useSpatialPicoRect, useSpatialViewport, type ViewportRect } from '../features/spatial/SpatialViewport';

type View = { position: THREE.Vector3; target: THREE.Vector3; offset: THREE.Vector3; intentId: string };
export interface UniverseCameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  offset: [number, number, number];
  intentId: string;
}
let lastUniverseView: View | null = null;
const poseScratch = { position: new THREE.Vector3(), target: new THREE.Vector3() };
const focalScratch = new THREE.Vector3();

/** Capture the published Universe pose before the shared Canvas switches renderers. */
export function capturePublishedUniverseView(intentId: string) {
  if (typeof document === 'undefined') return null;
  const canvas = document.querySelector<HTMLElement>('[data-spatial-stage] canvas');
  const pose = canvas?.dataset.spatialCamera?.split(',').map(Number);
  const offset = canvas?.dataset.spatialFocalOffset?.split(',').map(Number);
  if (!pose || pose.length !== 6 || pose.some((value) => !Number.isFinite(value))) return null;
  if (!offset || offset.length !== 3 || offset.some((value) => !Number.isFinite(value))) return null;
  const snapshot: UniverseCameraSnapshot = {
    position: [pose[0], pose[1], pose[2]],
    target: [pose[3], pose[4], pose[5]],
    offset: [offset[0], offset[1], offset[2]],
    intentId,
  };
  lastUniverseView = {
    position: new THREE.Vector3(...snapshot.position),
    target: new THREE.Vector3(...snapshot.target),
    offset: new THREE.Vector3(...snapshot.offset),
    intentId,
  };
  return snapshot;
}

/**
 * CameraControls 只在 `rest` 时通知外部，入场镜头期间它一直是 `enabled=false`，永远不会 rest——
 * 只靠事件发布位姿会让验收探针读到入场停止后的旧值（实测整段入场 168 帧全是同一个数）。
 * 这里改成逐帧发布：CameraControls 用 priority -1 先 `update(delta)`，本帧随后发布，
 * 于是属性始终等于渲染当帧真正生效的位姿。
 */
function publishCameraPose(instance: CameraControlsImpl, domElement: HTMLElement) {
  const position = instance.getPosition(poseScratch.position, false);
  const target = instance.getTarget(poseScratch.target, false);
  const focal = instance.getFocalOffset(focalScratch, false);
  domElement.dataset.spatialCamera = [position.x, position.y, position.z, target.x, target.y, target.z]
    .map((value) => value.toFixed(3)).join(',');
  domElement.dataset.spatialFocalOffset = [focal.x, focal.y, focal.z]
    .map((value) => value.toFixed(3)).join(',');
}

export interface CameraLifecycle {
  onReady: () => void;
  onEntryComplete: () => void;
}

export function CameraController({ intent, model, experiencePhase, motionAllowed, onEntryComplete, openingSeedIds, extractionFrame, returningToUniverse, reentryKey, universeRouteActive, reentrySnapshot }: Omit<CameraLifecycle, 'onReady'> & {
  intent: CameraIntent; model: SceneModel; experiencePhase: SpatialExperiencePhase; motionAllowed: boolean; openingSeedIds: ReadonlySet<string>;
  extractionFrame?: { active: boolean; positions: ReadonlyMap<string, [number, number, number]> | null };
  returningToUniverse: boolean;
  reentryKey: number;
  universeRouteActive: boolean;
  reentrySnapshot: UniverseCameraSnapshot | null;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const previousPhase = useRef<SpatialExperiencePhase | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const introOrbit = useRef<{ target: THREE.Vector3; direction: THREE.Vector3; distance: number; startedAt: number | null } | null>(null);
  const introPosition = useRef(new THREE.Vector3());
  const handledReentry = useRef<{ key: number; intentId: string } | null>(null);
  const reentryAnimationFrame = useRef<number | null>(null);
  const current = useRef({ model, intent, experiencePhase, onEntryComplete, openingSeedIds, extractionFrame, universeRouteActive });
  current.current = { model, intent, experiencePhase, onEntryComplete, openingSeedIds, extractionFrame, universeRouteActive };
  const { camera, size, invalidate, gl } = useThree();
  const usable = useSpatialViewport();
  const picoRect = useSpatialPicoRect();

  // 每渲染帧发布一次真实生效的相机位姿（见 publishCameraPose 注释）。
  useFrame(({ clock }) => {
    const instance = controls.current;
    const orbit = introOrbit.current;
    if (instance && current.current.experiencePhase === 'intro' && motionAllowed && orbit) {
      if (orbit.startedAt === null) orbit.startedAt = clock.elapsedTime;
      const direction = introOrbitDirection(orbit.direction, clock.elapsedTime - orbit.startedAt);
      introPosition.current.copy(direction).multiplyScalar(orbit.distance).add(orbit.target);
      applyCameraPose(instance, introPosition.current, orbit.target, false);
    }
    if (instance) {
      publishCameraPose(instance, gl.domElement);
      if (current.current.universeRouteActive && current.current.experiencePhase === 'universe' && !current.current.extractionFrame?.active) {
        lastUniverseView = {
          position: instance.getPosition(new THREE.Vector3(), false),
          target: instance.getTarget(new THREE.Vector3(), false),
          offset: instance.getFocalOffset(new THREE.Vector3(), false),
          intentId: current.current.intent.id,
        };
      }
    }
  });

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const readPose = () => ({
      position: instance.getPosition(new THREE.Vector3(), false),
      target: instance.getTarget(new THREE.Vector3(), false),
    });
    // Publish the settled pose so spatial E2E can verify camera ownership and
    // direction stability without reading React state or the WebGL scene graph.
    const publish = () => publishCameraPose(instance, gl.domElement);
    const remember = () => {
      publish();
      if (!current.current.universeRouteActive || current.current.experiencePhase !== 'universe' || current.current.extractionFrame?.active) return;
      const { position, target } = readPose();
      lastUniverseView = { position, target, offset: instance.getFocalOffset(new THREE.Vector3(), false), intentId: current.current.intent.id };
      if (handledReentry.current?.intentId === current.current.intent.id) gl.domElement.dataset.spatialReentryState = 'complete';
    };
    const takeControl = () => {
      // During extraction the camera belongs to the shot; users cannot grab it.
      if (current.current.experiencePhase !== 'universe' || current.current.extractionFrame?.active) return;
      timeline.current?.kill();
      timeline.current = null;
      if (reentryAnimationFrame.current !== null) cancelAnimationFrame(reentryAnimationFrame.current);
      reentryAnimationFrame.current = null;
      freezeCamera(instance);
    };
    gl.domElement.addEventListener('pointerdown', takeControl, true);
    gl.domElement.addEventListener('wheel', takeControl, { capture: true, passive: true });
    instance.addEventListener('rest', remember);
    publish();
    return () => { remember(); gl.domElement.removeEventListener('pointerdown', takeControl, true); gl.domElement.removeEventListener('wheel', takeControl, true); instance.removeEventListener('rest', remember); delete gl.domElement.dataset.spatialCamera; delete gl.domElement.dataset.spatialFocalOffset; };
  }, [gl]);

  useLayoutEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const wasEntering = previousPhase.current === 'awakening' || previousPhase.current === 'settling';
    const initial = previousPhase.current === null;
    previousPhase.current = experiencePhase;
    if (wasEntering && experiencePhase === 'universe') {
      // The shot's final pose is already live. Neither route cleanup nor a render resets it.
      lastUniverseView = { position: instance.getPosition(new THREE.Vector3(), false), target: instance.getTarget(new THREE.Vector3(), false), offset: instance.getFocalOffset(new THREE.Vector3(), false), intentId: intent.id };
      return;
    }
    const all = current.current.model.nodes;
    // Opening frames the seed cluster, not the whole universe; the camera goes to the seeds.
    const openingNodes = all.filter((node) => current.current.openingSeedIds.has(node.id));
    const introNodes = openingNodes.length ? openingNodes : all;
    const introSphere = new THREE.Box3().setFromPoints(introNodes.map((node) => new THREE.Vector3(...node.displayPosition))).getBoundingSphere(new THREE.Sphere());
    const fullSphere = new THREE.Box3().setFromPoints(all.map((node) => new THREE.Vector3(...node.displayPosition))).getBoundingSphere(new THREE.Sphere());
    const fullDistance = THREE.MathUtils.clamp(fullSphere.radius * 2.0, 42, 165);
    const branch = all.find((node) => node.id === intent.nodeId)?.branchId;
    const focused = intent.mode === 'goal' && experiencePhase === 'universe' ? all.filter((node) => node.branchId === branch) : all;
    const sphere = new THREE.Box3().setFromPoints(focused.map((node) => new THREE.Vector3(...node.displayPosition))).getBoundingSphere(new THREE.Sphere());
    const center = sphere.center;
    const distance = THREE.MathUtils.clamp(sphere.radius * 2.0, 42, 165);
    const overview = center.clone().add(new THREE.Vector3(distance * 0.60, distance * 0.43, distance * 0.66));
    const apply = (position: THREE.Vector3, target: THREE.Vector3, smooth = false) => {
      applyCameraPose(instance, position, target, smooth && motionAllowed);
      invalidate();
    };
    if (experiencePhase === 'intro') {
      // Camera finds the seeds; seeds never move toward the camera.
      const target = introSphere.center.clone();
      const direction = new THREE.Vector3(0.68, 0.38, 0.76).normalize();
      const introDistance = introCameraDistance(introSphere.radius);
      introOrbit.current = { target, direction, distance: introDistance, startedAt: null };
      const openingDirection = introOrbitDirection(direction, 0);
      void instance.setFocalOffset(openingSeedFocalOffset(introSphere.radius, size.width, size.height), 0, 0, false);
      apply(target.clone().addScaledVector(openingDirection, introDistance), target);
      return;
    }
    introOrbit.current = null;
    if (experiencePhase === 'awakening') {
      const shotTimeline = createEntryShot(
        { position: instance.getPosition(new THREE.Vector3(), false), target: instance.getTarget(new THREE.Vector3(), false) },
        fullSphere.center,
        fullDistance,
        ({ position, target }, progress) => {
          apply(position, target);
          const openingOffset = openingSeedFocalOffset(introSphere.radius, size.width, size.height);
          const focalProgress = 1 - (1 - progress) ** 3;
          void instance.setFocalOffset(THREE.MathUtils.lerp(openingOffset, 0, focalProgress), 0, 0, false);
        },
        () => {
          void instance.setFocalOffset(0, 0, 0, false);
          current.current.onEntryComplete();
        },
      );
      timeline.current = shotTimeline;
      return;
    }
    if (experiencePhase === 'settling') return;
    if (extractionFrame?.active) {
      // Goal extraction reframes along the current view direction; it never turns the camera.
      if (extractionFrame.positions) {
        const points = [...extractionFrame.positions.values()].map((position) => new THREE.Vector3(...position));
        const sphere = new THREE.Box3().setFromPoints(points).getBoundingSphere(new THREE.Sphere());
        const currentPosition = instance.getPosition(new THREE.Vector3(), false);
        const currentTarget = instance.getTarget(new THREE.Vector3(), false);
        const frame = frameSphereAlongView(camera as THREE.PerspectiveCamera, currentPosition, currentTarget, sphere, 1.3);
        apply(frame.position, frame.target, true);
      }
      return;
    }
    const savedReentryView = reentrySnapshot?.intentId === intent.id ? {
      position: new THREE.Vector3(...reentrySnapshot.position),
      target: new THREE.Vector3(...reentrySnapshot.target),
      offset: new THREE.Vector3(...reentrySnapshot.offset),
      intentId: reentrySnapshot.intentId,
    } : lastUniverseView;
    if (returningToUniverse && savedReentryView?.intentId === intent.id) {
      if (handledReentry.current?.key === reentryKey && handledReentry.current.intentId === intent.id) {
        gl.domElement.dataset.spatialReentryState = 'handled';
        return;
      }
      handledReentry.current = { key: reentryKey, intentId: intent.id };
      const destination = {
        position: savedReentryView.position.clone(),
        target: savedReentryView.target.clone(),
        offset: savedReentryView.offset.clone(),
      };
      gl.domElement.dataset.spatialReentryState = `start:${motionAllowed ? 'motion' : 'instant'}`;
      if (motionAllowed) {
        const position = new THREE.Vector3();
        const target = new THREE.Vector3();
        const offset = new THREE.Vector3();
        const begin = () => {
          if (controls.current !== instance) return;
          const start = {
            position: instance.getPosition(new THREE.Vector3(), false),
            target: instance.getTarget(new THREE.Vector3(), false),
            offset: instance.getFocalOffset(new THREE.Vector3(), false),
          };
          const startedAt = performance.now();
          const tick = (now: number) => {
            if (controls.current !== instance) return;
            const linear = THREE.MathUtils.clamp((now - startedAt) / 460, 0, 1);
            const eased = 1 - (1 - linear) ** 3;
            position.lerpVectors(start.position, destination.position, eased);
            target.lerpVectors(start.target, destination.target, eased);
            offset.lerpVectors(start.offset, destination.offset, eased);
            apply(position, target);
            void instance.setFocalOffset(offset.x, offset.y, offset.z, false);
            publishCameraPose(instance, gl.domElement);
            gl.domElement.dataset.spatialReentryProgress = linear.toFixed(3);
            if (linear < 1) reentryAnimationFrame.current = requestAnimationFrame(tick);
            else {
              reentryAnimationFrame.current = null;
              lastUniverseView = { ...destination, intentId: intent.id };
              gl.domElement.dataset.spatialReentryState = 'complete';
            }
          };
          reentryAnimationFrame.current = requestAnimationFrame(tick);
        };
        reentryAnimationFrame.current = requestAnimationFrame(() => {
          reentryAnimationFrame.current = requestAnimationFrame(begin);
        });
      } else {
        apply(destination.position, destination.target);
        void instance.setFocalOffset(...destination.offset.toArray(), false);
      }
      return;
    }
    if (initial && lastUniverseView?.intentId === intent.id) {
      apply(lastUniverseView.position, lastUniverseView.target);
      void instance.setFocalOffset(...lastUniverseView.offset.toArray(), false);
      return;
    }
    if (intent.mode === 'overview' || intent.mode === 'goal') {
      // Pico Dock 打开时不缩小画布：由构图让位完成空间划分。
      // 只补偿 Pico 自身的矩形，避免把导航等常驻遮挡的历史偏移带进 overview 构图。
      const picoUsable: ViewportRect | undefined = picoRect
        ? { left: 0, top: 0, width: Math.max(0, Math.min(size.width, picoRect.left)), height: size.height }
        : undefined;
      const overviewFocal = viewportFocalOffset(camera as THREE.PerspectiveCamera, overview.distanceTo(center), size.width, size.height, picoUsable);
      void instance.setFocalOffset(overviewFocal.x, overviewFocal.y, 0, motionAllowed && !initial);
      apply(overview, center, !initial);
      return;
    }
    const selected = all.find((node) => node.id === intent.nodeId);
    if (!selected) return;
    const radius = selected.type === 'goal' ? 1.8 : ['course', 'skill', 'direction'].includes(selected.type) ? 0.9 : 0.5;
    const pose = nodeFocusPose(camera as THREE.PerspectiveCamera, new THREE.Vector3(...selected.displayPosition), radius, size.height);
    apply(pose.position, pose.target, true);
    const focal = viewportFocalOffset(camera as THREE.PerspectiveCamera, pose.position.distanceTo(pose.target), size.width, size.height, usable);
    void instance.setFocalOffset(focal.x, focal.y, 0, motionAllowed);
    // Hover/color changes must not steal the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiencePhase, intent.id, size.width, size.height, motionAllowed, camera, invalidate, usable, picoRect, extractionFrame?.active, extractionFrame?.positions, returningToUniverse, reentryKey, reentrySnapshot]);

  useEffect(() => {
    const visibility = () => {
      if (document.hidden) timeline.current?.pause();
      else { timeline.current?.resume(); invalidate(); }
    };
    const contextLost = () => timeline.current?.kill();
    document.addEventListener('visibilitychange', visibility);
    gl.domElement.addEventListener('webglcontextlost', contextLost);
    return () => { document.removeEventListener('visibilitychange', visibility); gl.domElement.removeEventListener('webglcontextlost', contextLost); };
  }, [gl, invalidate]);
  useEffect(() => () => {
    timeline.current?.kill();
    if (reentryAnimationFrame.current !== null) cancelAnimationFrame(reentryAnimationFrame.current);
  }, []);

  return <CameraControls ref={controls} enabled={experiencePhase === 'universe' && !extractionFrame?.active} makeDefault minDistance={4} maxDistance={240} minPolarAngle={0.05} maxPolarAngle={Math.PI - 0.05} smoothTime={motionAllowed ? 0.16 : 0} draggingSmoothTime={0.06} dollySpeed={0.8} truckSpeed={1} azimuthRotateSpeed={0.68} polarRotateSpeed={0.62} mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }} touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }} />;
}
