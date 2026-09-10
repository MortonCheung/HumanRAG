import * as THREE from 'three';
import type { TreePositionMap } from './customTreeLayout';

/** Fit the same centred model in either a catalogue preview or an editable stage. */
export function customTreeFrame(positions: TreePositionMap, width: number, height: number, preview: boolean) {
  const points = [...positions.values()].map((point) => new THREE.Vector3(...point));
  const sphere = new THREE.Box3().setFromPoints(points.length ? points : [new THREE.Vector3()]).getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(2.8, sphere.radius);
  const verticalFov = THREE.MathUtils.degToRad(46);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(0.1, width / Math.max(1, height)));
  const distance = THREE.MathUtils.clamp(radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * (preview ? 1.15 : 1.68), 12, 320);
  const target = new THREE.Vector3(0, preview ? 0 : -radius * 0.22, 0);
  return {
    offset: sphere.center.negate(),
    position: new THREE.Vector3(0.5, 0.22, 0.82).normalize().multiplyScalar(distance).add(target),
    target,
  };
}
