import * as THREE from 'three';

/** Returns the smallest NDC translation that clears navigation and the inspector. */
export function framingCorrection(x: number, y: number, z: number, width: number, height: number) {
  const left = -1 + 64 / width;
  const right = width >= 768 ? 1 - (Math.min(410, width - 48) + 64) * 2 / width : 0.82;
  const top = 1 - 112 * 2 / height;
  const bottom = width >= 768 ? -0.82 : 0.08;
  if (z < -1 || z > 1 || Math.abs(x) > 1.4 || Math.abs(y) > 1.4) return { kind: 'distant' as const, x: (left + right) / 2, y: (top + bottom) / 2 };
  const nextX = Math.max(left, Math.min(right, x));
  const nextY = Math.max(bottom, Math.min(top, y));
  return { kind: nextX === x && nextY === y ? 'visible' as const : 'edge' as const, x: nextX, y: nextY };
}

/** Selection owns the orbit target: the node must be at the actual screen centre. */
export function nodeFocusPose(camera: THREE.PerspectiveCamera, point: THREE.Vector3, radius: number, height: number) {
  camera.updateMatrixWorld();
  const distance = camera.position.distanceTo(point);
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const focusDistance = THREE.MathUtils.clamp(radius * height / (34 * halfFov), 18, 48);
  const offset = camera.getWorldDirection(new THREE.Vector3()).negate().multiplyScalar(Math.max(4, Math.min(distance, focusDistance)));
  const target = point.clone();
  return { position: target.clone().add(offset), target };
}
