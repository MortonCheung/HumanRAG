import * as THREE from 'three';
import type CameraControls from 'camera-controls';
import type { ViewportRect } from '../features/spatial/SpatialViewport';

/** Keep orbit ownership on the real node while composing for the measured viewport. */
export function viewportFocalOffset(camera: THREE.PerspectiveCamera, distance: number, width: number, height: number, rect?: ViewportRect) {
  if (!rect || width <= 0 || height <= 0) return new THREE.Vector3();
  const x = (rect.left + rect.width / 2) / width * 2 - 1;
  const y = 1 - (rect.top + rect.height / 2) / height * 2;
  const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV() / 2));
  return new THREE.Vector3(-x * halfHeight * camera.aspect, y * halfHeight, 0);
}

export function applyCameraPose(controls: CameraControls, position: THREE.Vector3, target: THREE.Vector3, smooth: boolean) {
  controls.normalizeRotations();
  const start = controls.azimuthAngle;
  void controls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, smooth);
  if (smooth) {
    const end = controls.getSpherical(new THREE.Spherical(), true).theta;
    // Normalization alone does not cover a destination crossing the ±π seam.
    void controls.rotateAzimuthTo(start + Math.atan2(Math.sin(end - start), Math.cos(end - start)), true);
  }
}

export function freezeCamera(controls: CameraControls) {
  const position = controls.getPosition(new THREE.Vector3(), false);
  const target = controls.getTarget(new THREE.Vector3(), false);
  const offset = controls.getFocalOffset(new THREE.Vector3(), false);
  applyCameraPose(controls, position, target, false);
  void controls.setFocalOffset(offset.x, offset.y, offset.z, false);
}

/** Selection owns the orbit target; the measured focal offset handles screen composition. */
export function nodeFocusPose(camera: THREE.PerspectiveCamera, point: THREE.Vector3, radius: number, height: number) {
  camera.updateMatrixWorld();
  const distance = camera.position.distanceTo(point);
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const focusDistance = THREE.MathUtils.clamp(radius * height / (34 * halfFov), 18, 48);
  const offset = camera.getWorldDirection(new THREE.Vector3()).negate().multiplyScalar(Math.max(4, Math.min(distance, focusDistance)));
  const target = point.clone();
  return { position: target.clone().add(offset), target };
}
