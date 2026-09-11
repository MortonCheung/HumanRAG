import gsap from 'gsap';
import * as THREE from 'three';

export interface CameraPose { position: THREE.Vector3; target: THREE.Vector3 }

/** The shot owns only a progress value. Killing it must never rewind the live camera. */
export function createEntryShot(from: CameraPose, to: CameraPose, apply: (pose: CameraPose) => void, complete: () => void) {
  const fromOffset = from.position.clone().sub(from.target);
  const toOffset = to.position.clone().sub(to.target);
  const direction = fromOffset.clone().normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(direction, toOffset.clone().normalize());
  const orientation = new THREE.Quaternion();
  const shot = { progress: 0 };
  const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  return gsap.timeline({ onComplete: complete }).to(shot, {
    progress: 1, duration: 1.92, ease: 'power3.out',
    onUpdate: () => {
      pose.target.lerpVectors(from.target, to.target, shot.progress);
      orientation.identity().slerp(rotation, shot.progress);
      const distance = Math.exp(THREE.MathUtils.lerp(Math.log(Math.max(0.01, fromOffset.length())), Math.log(Math.max(0.01, toOffset.length())), shot.progress));
      pose.position.copy(direction).applyQuaternion(orientation).multiplyScalar(distance).add(pose.target);
      apply(pose);
    },
  });
}
