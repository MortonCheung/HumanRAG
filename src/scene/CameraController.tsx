import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraIntent, SceneModel } from '../graph/types';

function boundsForActive(model: SceneModel) {
  const points = model.nodes
    .filter((node) => node.visualState === 'active' || node.visualState === 'selected')
    .map((node) => new THREE.Vector3(...node.displayPosition));
  const box = new THREE.Box3().setFromPoints(points.length > 0 ? points : [new THREE.Vector3()]);
  return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
}

export function CameraController({ intent, model }: { intent: CameraIntent; model: SceneModel }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const desiredPosition = useRef(new THREE.Vector3(45, 33, 56));
  const desiredTarget = useRef(new THREE.Vector3());
  const animating = useRef(true);

  useEffect(() => {
    const narrow = size.width / Math.max(size.height, 1) < 1.05;
    if (intent.mode === 'overview') {
      desiredPosition.current.set(narrow ? 58 : 45, narrow ? 42 : 33, narrow ? 72 : 56);
      desiredTarget.current.set(0, 0, 0);
    } else if (intent.mode === 'goal') {
      const { center, size: activeSize } = boundsForActive(model);
      const radius = Math.max(activeSize.x, activeSize.y * 0.72, activeSize.z, 12);
      desiredTarget.current.copy(center);
      desiredPosition.current.set(
        center.x + radius * (narrow ? 0.82 : 0.82),
        center.y + radius * (narrow ? 0.62 : 0.74),
        center.z + radius * (narrow ? 1.1 : 1.15),
      );
    } else {
      const node = model.nodes.find((item) => item.id === intent.nodeId);
      if (node) {
        const target = new THREE.Vector3(...node.displayPosition);
        const distance = node.type === 'goal' ? 18 : node.type === 'direction' ? 15 : node.type === 'practice' ? 7.5 : 10.5;
        desiredTarget.current.copy(target);
        desiredPosition.current.set(target.x + distance * 0.76, target.y + distance * 0.54, target.z + distance * (narrow ? 1.36 : 1.02));
      }
    }
    animating.current = true;
  }, [intent.id, size.height, size.width]);

  useFrame((_, delta) => {
    if (!animating.current) return;
    const amount = 1 - Math.pow(0.001, delta / 0.72);
    camera.position.lerp(desiredPosition.current, amount);
    controls.current?.target.lerp(desiredTarget.current, amount);
    controls.current?.update();
    if (camera.position.distanceTo(desiredPosition.current) < 0.05 && (controls.current?.target.distanceTo(desiredTarget.current) ?? 0) < 0.05) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={5}
      maxDistance={132}
      minPolarAngle={0.24}
      maxPolarAngle={1.5}
      enablePan={false}
      rotateSpeed={0.46}
      zoomSpeed={0.7}
      onStart={() => { animating.current = false; }}
    />
  );
}
