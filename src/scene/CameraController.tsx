import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type gsap from 'gsap';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';
import { applyCameraPose, freezeCamera, nodeFocusPose, viewportFocalOffset } from './cameraFraming';
import { createEntryShot } from './entryShot';
import { useSpatialViewport } from '../features/spatial/SpatialViewport';

type View = { position: THREE.Vector3; target: THREE.Vector3; offset: THREE.Vector3; intentId: string };
let lastUniverseView: View | null = null;
export interface CameraLifecycle {
  onReady: () => void;
  onEntryComplete: () => void;
  skipVersion: number;
}

export function CameraController({ intent, model, experiencePhase, motionAllowed, onEntryComplete, skipVersion }: Omit<CameraLifecycle, 'onReady'> & {
  intent: CameraIntent; model: SceneModel; experiencePhase: SpatialExperiencePhase; motionAllowed: boolean;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const previousPhase = useRef<SpatialExperiencePhase | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const current = useRef({ model, intent, experiencePhase, onEntryComplete });
  current.current = { model, intent, experiencePhase, onEntryComplete };
  const { camera, size, invalidate, gl } = useThree();
  const usable = useSpatialViewport();

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const remember = () => {
      if (current.current.experiencePhase !== 'universe') return;
      lastUniverseView = { position: instance.getPosition(new THREE.Vector3(), false), target: instance.getTarget(new THREE.Vector3(), false), offset: instance.getFocalOffset(new THREE.Vector3(), false), intentId: current.current.intent.id };
    };
    const takeControl = () => {
      timeline.current?.kill();
      timeline.current = null;
      freezeCamera(instance);
      if (current.current.experiencePhase === 'entering') current.current.onEntryComplete();
    };
    gl.domElement.addEventListener('pointerdown', takeControl, true);
    gl.domElement.addEventListener('wheel', takeControl, { capture: true, passive: true });
    instance.addEventListener('rest', remember);
    return () => { remember(); gl.domElement.removeEventListener('pointerdown', takeControl, true); gl.domElement.removeEventListener('wheel', takeControl, true); instance.removeEventListener('rest', remember); };
  }, [gl]);

  useLayoutEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const wasEntering = previousPhase.current === 'entering';
    const initial = previousPhase.current === null;
    previousPhase.current = experiencePhase;
    if (wasEntering && experiencePhase === 'universe') {
      // The shot's final pose is already live. Neither route cleanup nor a render resets it.
      lastUniverseView = { position: instance.getPosition(new THREE.Vector3(), false), target: instance.getTarget(new THREE.Vector3(), false), offset: instance.getFocalOffset(new THREE.Vector3(), false), intentId: intent.id };
      return;
    }
    const all = current.current.model.nodes;
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
    if (experiencePhase === 'landing') {
      void instance.setFocalOffset(0, 0, 0, false);
      const target = center.clone();
      const direction = new THREE.Vector3(0.68, 0.38, 0.76).normalize();
      const screenRight = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize().negate();
      target.addScaledVector(screenRight, size.width >= 820 ? -sphere.radius * 0.58 : 0);
      if (size.width < 820) target.y -= sphere.radius * 0.24;
      apply(target.clone().addScaledVector(direction, distance * (size.width >= 820 ? 0.98 : 1.55)), target);
      return;
    }
    if (experiencePhase === 'entering') {
      const shotTimeline = createEntryShot(
        { position: instance.getPosition(new THREE.Vector3(), false), target: instance.getTarget(new THREE.Vector3(), false) },
        { position: overview, target: center },
        ({ position, target }) => apply(position, target),
        () => current.current.onEntryComplete(),
      );
      timeline.current = shotTimeline;
      return () => { shotTimeline.kill(); if (timeline.current === shotTimeline) timeline.current = null; };
    }
    if (initial && lastUniverseView?.intentId === intent.id) {
      apply(lastUniverseView.position, lastUniverseView.target);
      void instance.setFocalOffset(...lastUniverseView.offset.toArray(), false);
      return;
    }
    if (intent.mode !== 'node') { void instance.setFocalOffset(0, 0, 0, motionAllowed && !initial); apply(overview, center, !initial); return; }
    const selected = all.find((node) => node.id === intent.nodeId);
    if (!selected) return;
    const radius = selected.type === 'goal' ? 1.8 : ['course', 'skill', 'direction'].includes(selected.type) ? 0.9 : 0.5;
    const pose = nodeFocusPose(camera as THREE.PerspectiveCamera, new THREE.Vector3(...selected.displayPosition), radius, size.height);
    apply(pose.position, pose.target, true);
    const focal = viewportFocalOffset(camera as THREE.PerspectiveCamera, pose.position.distanceTo(pose.target), size.width, size.height, usable);
    void instance.setFocalOffset(focal.x, focal.y, 0, motionAllowed);
    // Hover/color changes must not steal the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiencePhase, intent.id, size.width, size.height, motionAllowed, camera, invalidate, usable]);

  useEffect(() => {
    if (skipVersion && current.current.experiencePhase === 'entering') timeline.current?.progress(1);
  }, [skipVersion]);
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

  return <CameraControls ref={controls} enabled={experiencePhase !== 'landing'} makeDefault minDistance={4} maxDistance={240} minPolarAngle={0.05} maxPolarAngle={Math.PI - 0.05} smoothTime={motionAllowed ? 0.16 : 0} draggingSmoothTime={0.06} dollySpeed={0.8} truckSpeed={1} azimuthRotateSpeed={0.68} polarRotateSpeed={0.62} mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }} touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }} />;
}
