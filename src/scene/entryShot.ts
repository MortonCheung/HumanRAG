import gsap from 'gsap';
import * as THREE from 'three';

export interface CameraPose { position: THREE.Vector3; target: THREE.Vector3 }

export const ENTRY_CAMERA_MOTION_DURATION = 2.15;
export const ENTRY_SHOT_DURATION = 2.70;
export const ENTRY_AZIMUTH_ORBIT_DEGREES = 118;
export const INTRO_ORBIT_YAW_DEGREES = 3.5;
export const INTRO_ORBIT_PITCH_DEGREES = 1.2;
export const INTRO_ORBIT_PERIOD_SECONDS = 10;

/** Small bounded parallax for the idle constellation. The model itself never rotates. */
export function introOrbitDirection(baseDirection: THREE.Vector3, elapsed: number) {
  const phase = elapsed / INTRO_ORBIT_PERIOD_SECONDS * Math.PI * 2;
  const spherical = new THREE.Spherical().setFromVector3(baseDirection.clone().normalize());
  spherical.theta += THREE.MathUtils.degToRad(INTRO_ORBIT_YAW_DEGREES) * Math.sin(phase);
  spherical.phi = THREE.MathUtils.clamp(
    spherical.phi + THREE.MathUtils.degToRad(INTRO_ORBIT_PITCH_DEGREES) * Math.cos(phase),
    0.01,
    Math.PI - 0.01,
  );
  return new THREE.Vector3().setFromSpherical(spherical).normalize();
}

export function entryPoseAt(from: CameraPose, toTarget: THREE.Vector3, toDistance: number, progress: number, pose: CameraPose = { position: new THREE.Vector3(), target: new THREE.Vector3() }) {
  const linear = THREE.MathUtils.clamp(progress, 0, 1);
  const orbitProgress = THREE.MathUtils.smoothstep(linear, 0, 1);
  const distanceProgress = 1 - (1 - linear) ** 3;
  const direction = from.position.clone().sub(from.target).normalize()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(ENTRY_AZIMUTH_ORBIT_DEGREES) * orbitProgress);
  const fromDistance = from.position.distanceTo(from.target);
  pose.target.lerpVectors(from.target, toTarget, orbitProgress);
  const distance = Math.exp(THREE.MathUtils.lerp(
    Math.log(Math.max(0.01, fromDistance)),
    Math.log(Math.max(0.01, toDistance)),
    distanceProgress,
  ));
  pose.position.copy(direction).multiplyScalar(distance).add(pose.target);
  return pose;
}

/** Orbit around world Y, settle by 2.15 s, then hold the exact pose until handoff. */
export function createEntryShot(from: CameraPose, toTarget: THREE.Vector3, toDistance: number, apply: (pose: CameraPose, progress: number) => void, complete: () => void) {
  const shot = { progress: 0 };
  const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  return gsap.timeline({ onComplete: complete }).to(shot, {
    progress: 1, duration: ENTRY_CAMERA_MOTION_DURATION, ease: 'none',
    onUpdate: () => {
      apply(entryPoseAt(from, toTarget, toDistance, shot.progress, pose), shot.progress);
    },
  }).to({}, { duration: ENTRY_SHOT_DURATION - ENTRY_CAMERA_MOTION_DURATION });
}
