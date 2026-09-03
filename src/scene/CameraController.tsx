import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraIntent, SceneModel } from '../graph/types';
import type { SpatialExperiencePhase } from '../features/spatial/SpatialExperienceContext';

function boundsForIntent(model: SceneModel, intent: CameraIntent) {
  const targetBranch = intent.nodeId ? model.nodes.find((node) => node.id === intent.nodeId)?.branchId : undefined;
  const ids = intent.mode === 'node'
    ? new Set(model.nodes.filter((node) => ['selected', 'upstream', 'downstream', 'lateral'].includes(node.visualState)).map((node) => node.id))
    : intent.mode === 'goal'
      ? new Set(model.nodes.filter((node) => node.branchId === targetBranch).map((node) => node.id))
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
  const modelRef = useRef(model);
  const { size } = useThree();

  modelRef.current = model;

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const box = boundsForIntent(modelRef.current, intent);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = sphere.center;
    const overviewDistance = experiencePhase === 'landing' || experiencePhase === 'entering' || intent.mode === 'overview';
    const distance = THREE.MathUtils.clamp(sphere.radius * (overviewDistance ? 2.08 : 2.85), overviewDistance ? 42 : 22, 162);
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

    if (intent.mode === 'overview') {
      void instance.setLookAt(
        center.x + distance * 0.58,
        center.y + distance * 0.38,
        center.z + distance * 0.66,
        center.x,
        center.y,
        center.z,
        true,
      );
      return;
    }

    if (intent.mode === 'goal') {
      const targetOffset = size.width >= 920 ? sphere.radius * 0.16 : 0;
      void instance.setLookAt(
        center.x + distance * 0.58,
        center.y + distance * 0.4,
        center.z + distance * 0.66,
        center.x + targetOffset,
        center.y,
        center.z,
        true,
      );
      return;
    }

    const selected = intent.nodeId
      ? modelRef.current.nodes.find((node) => node.id === intent.nodeId)
      : null;
    if (!selected) return;

    // 远距离切点只平移观察位置，保留用户当前的旋转与缩放；右侧检查器打开时做轻微光学偏移。
    const cameraPosition = instance.getPosition(new THREE.Vector3());
    const currentTarget = instance.getTarget(new THREE.Vector3());
    const offset = cameraPosition.sub(currentTarget);
    const nextTarget = new THREE.Vector3(...selected.displayPosition);
    if (size.width >= 920) nextTarget.x += Math.max(1.4, offset.length() * 0.045);
    const nextPosition = nextTarget.clone().add(offset);
    void instance.setLookAt(
      nextPosition.x,
      nextPosition.y,
      nextPosition.z,
      nextTarget.x,
      nextTarget.y,
      nextTarget.z,
      true,
    );
    return undefined;
    // SceneModel 会因 Hover 更新；只有镜头意图变化时才允许自动适配，避免抢夺用户控制。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiencePhase, intent.id, size.width]);

  return <CameraControls ref={controls} enabled={experiencePhase === 'universe'} makeDefault minDistance={4} maxDistance={190} minPolarAngle={0.05} maxPolarAngle={Math.PI - 0.05} smoothTime={0.62} draggingSmoothTime={0.1} dollySpeed={0.8} truckSpeed={1} azimuthRotateSpeed={0.68} polarRotateSpeed={0.62} mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.DOLLY, right: CameraControlsImpl.ACTION.TRUCK, wheel: CameraControlsImpl.ACTION.DOLLY }} touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK, three: CameraControlsImpl.ACTION.TOUCH_TRUCK }} />;
}
