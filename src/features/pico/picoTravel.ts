import * as THREE from 'three';

export const PICO_CAMERA_DELAY_MS = 120;
export const PICO_FLIGHT_DURATION_MS = 520;

export function quadraticBezier(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  out = new THREE.Vector3(),
) {
  const progress = THREE.MathUtils.clamp(t, 0, 1);
  const a = (1 - progress) * (1 - progress);
  const b = 2 * (1 - progress) * progress;
  const c = progress * progress;
  return out.copy(start).multiplyScalar(a).addScaledVector(control, b).addScaledVector(end, c);
}

export function picoCameraAxes(cameraDirection: THREE.Vector3, cameraUp: THREE.Vector3) {
  const up = cameraUp.clone().normalize();
  const right = new THREE.Vector3().crossVectors(cameraDirection, up).normalize();
  return { right, up };
}

export function picoNodeTarget(
  nodePosition: THREE.Vector3,
  nodeRadius: number,
  cameraDirection: THREE.Vector3,
  cameraUp: THREE.Vector3,
) {
  const { right, up } = picoCameraAxes(cameraDirection, cameraUp);
  return nodePosition.clone()
    .addScaledVector(right, nodeRadius + 1.2)
    .addScaledVector(up, 0.9);
}

export function picoFlightControl(start: THREE.Vector3, end: THREE.Vector3, up: THREE.Vector3) {
  return start.clone().lerp(end, 0.5).addScaledVector(up.clone().normalize(), 2.2);
}

export function easeOutCubic(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}
