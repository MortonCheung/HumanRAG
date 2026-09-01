import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';

function boundsForIntent(model: SceneModel, intent: CameraIntent) {
  const ids = intent.mode === 'node'
    ? new Set(model.nodes.filter((node) => ['selected', 'upstream', 'downstream', 'lateral'].includes(node.visualState)).map((node) => node.id))
    : intent.mode === 'goal'
      ? new Set(model.nodes.filter((node) => ['lensActive', 'contextual'].includes(node.visualState)).map((node) => node.id))
      : new Set(model.nodes.map((node) => node.id));
  const points = model.nodes.filter((node) => ids.has(node.id)).map((node) => new THREE.Vector3(...node.displayPosition));
  return new THREE.Box3().setFromPoints(points.length ? points : [new THREE.Vector3()]);
}

export function CameraController({
  intent,
  model,
  experiencePhase,
}: {
  intent: CameraIntent;
  model: SceneModel;
  experiencePhase: SpatialExperiencePhase;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const previousPhase = useRef<SpatialExperiencePhase | null>(null);
  const { size } = useThree();

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const box = boundsForIntent(model, intent);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = sphere.center;
    const distance = THREE.MathUtils.clamp(sphere.radius * 2.34, 46, 162);
    const wasEntering = previousPhase.current === 'entering';
    previousPhase.current = experiencePhase;

    if (experiencePhase === 'landing') {
      const landingOffset = size.width >= 820 ? sphere.radius * 0.42 : 0;
      const targetX = center.x - landingOffset;
      void instance.setLookAt(
        targetX,
        center.y + distance,
        center.z + 0.001,
        targetX,
        center.y,
        center.z,
        false,
      );
      return;
    }

    if (experiencePhase === 'entering') {
      void instance.setLookAt(
        center.x + distance * 0.58,
        center.y + distance * 0.34,
        center.z + distance * 0.62,
        center.x,
        center.y,
        center.z,
        true,
      );
      return;
    }

    // 入场完成时保留刚到达的斜视构图，不再用一次 fitToBox 打断连续轨迹。
    if (wasEntering) return;

    const compact = size.width < 768;
    const rightRatio = compact || intent.mode !== 'node' ? 0 : Math.min(0.46, 420 / Math.max(1, size.width));
    const boxSize = box.getSize(new THREE.Vector3());
    const padding = Math.max(2.4, Math.max(boxSize.x, boxSize.y, boxSize.z) * 0.16);
    void instance.fitToBox(box, true, {
      paddingTop: padding,
      paddingLeft: padding,
      paddingRight: compact ? padding : padding + boxSize.x * rightRatio * 0.9,
      paddingBottom: compact ? padding + boxSize.y * 0.3 : padding,
    });
    return undefined;
    // SceneModel 会因 Hover 更新；只有镜头意图变化时才允许自动适配，避免抢夺用户控制。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiencePhase, intent.id, model, size.width]);

  return <CameraControls ref={controls} enabled={experiencePhase === 'universe'} makeDefault minDistance={4} maxDistance={190} minPolarAngle={0.05} maxPolarAngle={Math.PI - 0.05} smoothTime={0.62} draggingSmoothTime={0.1} dollySpeed={0.8} truckSpeed={1} azimuthRotateSpeed={0.68} polarRotateSpeed={0.62} mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }} touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }} />;
}
