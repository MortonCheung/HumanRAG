import gsap from 'gsap';
import * as THREE from 'three';

export interface CameraPose { position: THREE.Vector3; target: THREE.Vector3 }

/** Direction stays fixed the whole shot: target moves, distance changes, no orbiting. */
export function createEntryShot(from: CameraPose, toTarget: THREE.Vector3, toDistance: number, apply: (pose: CameraPose) => void, complete: () => void) {
  const direction = from.position.clone().sub(from.target).normalize();
  const fromDistance = from.position.distanceTo(from.target);
  const shot = { progress: 0 };
  const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  return gsap.timeline({ onComplete: complete }).to(shot, {
    // 手册第 11 章指定的入场镜头：方向固定、target 移动、distance 变化，尾部收束。
    progress: 1, duration: 2.15, ease: 'power3.out',
    onUpdate: () => {
      pose.target.lerpVectors(from.target, toTarget, shot.progress);
      const distance = Math.exp(THREE.MathUtils.lerp(Math.log(Math.max(0.01, fromDistance)), Math.log(Math.max(0.01, toDistance)), shot.progress));
      pose.position.copy(direction).multiplyScalar(distance).add(pose.target);
      apply(pose);
    },
  });
}
