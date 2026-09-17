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

/** Reframe a sphere without turning the camera: the current view direction is kept. */
export function frameSphereAlongView(  camera: THREE.PerspectiveCamera,
  currentPosition: THREE.Vector3,
  currentTarget: THREE.Vector3,
  sphere: THREE.Sphere,
  padding = 1.28,
) {
  const direction = currentPosition.clone().sub(currentTarget).normalize();
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(0.1, camera.aspect));
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const distance = THREE.MathUtils.clamp(sphere.radius / Math.sin(limitingFov / 2) * padding, 8, 320);
  const target = sphere.center.clone();
  const position = target.clone().addScaledVector(direction, distance);
  return { position, target };
}

/** The single perspective camera every spatial route shares. */
export const SPATIAL_CAMERA_FOV = 44;

/**
 * Opening 相机距离：以 seed 簇包围球为对象。
 * 乘数沿用手册第 10 章的 3.1（约等于带 16% 余量的包围球拟合）。
 * 手册给的上限 46 会把这枚距离截断——实测 seed 簇半径约 19.6、需要 60.9——
 * 结果是桌面端最上方 seed 钻进顶栏、移动端横向溢出，所以上限放宽到 150。
 * 见 cameraFraming.test.ts「Opening 取景」。
 */
export const INTRO_DISTANCE_MULTIPLIER = 3.1;
export const INTRO_DISTANCE_MIN = 13;
export const INTRO_DISTANCE_MAX = 150;

export function introCameraDistance(radius: number) {
  return THREE.MathUtils.clamp(
    radius * INTRO_DISTANCE_MULTIPLIER,
    INTRO_DISTANCE_MIN,
    INTRO_DISTANCE_MAX,
  );
}

/**
 * Opening 等待态只改变取景，不改变 seed 的世界坐标。
 * 宽屏保留约 7% 画宽的轻微右移；窄屏按可用横向空间收敛，避免重新引入溢出。
 */
export function openingSeedFocalOffset(radius: number, width: number, height: number) {
  if (radius <= 0 || width <= 0 || height <= 0) return 0;
  const aspect = width / height;
  const viewportScale = THREE.MathUtils.clamp((aspect - 0.45) / 1.15, 0.42, 1);
  return -THREE.MathUtils.clamp(radius * 0.14 * viewportScale, 0.8, 3.2);
}
