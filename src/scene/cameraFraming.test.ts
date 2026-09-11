// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import CameraControls from 'camera-controls';
import * as THREE from 'three';
import { applyCameraPose, freezeCamera, nodeFocusPose, viewportFocalOffset } from './cameraFraming';
import { usableViewport } from '../features/spatial/SpatialViewport';
CameraControls.install({ THREE });

describe('continuous camera and effective viewport', () => {
  it.each([179, 181, 401, -401, 721])('takes the shortest route after %s degrees of accumulated rotation', (angle) => {
    const camera = new THREE.PerspectiveCamera(44, 1.6, 0.1, 420);
    const controls = new CameraControls(camera);
    controls.setLookAt(0, 10, 40, 0, 0, 0, false);
    controls.rotateAzimuthTo(THREE.MathUtils.degToRad(angle), false);
    controls.update(1 / 60);
    const target = new THREE.Vector3(3, 2, 1);
    const pose = nodeFocusPose(camera, target, 0.5, 900);
    applyCameraPose(controls, pose.position, pose.target, true);
    const delta = controls.getSpherical(new THREE.Spherical(), true).theta - controls.azimuthAngle;
    expect(Math.abs(delta)).toBeLessThan(0.001);
    controls.dispose();
  });

  it('crosses the +179 to -179 seam by two degrees, not 358', () => {
    const camera = new THREE.PerspectiveCamera();
    const controls = new CameraControls(camera);
    controls.setLookAt(0, 0, 40, 0, 0, 0, false);
    controls.rotateAzimuthTo(THREE.MathUtils.degToRad(179), false);
    const end = new THREE.Vector3().setFromSpherical(new THREE.Spherical(40, Math.PI / 2, THREE.MathUtils.degToRad(-179)));
    applyCameraPose(controls, end, new THREE.Vector3(), true);
    const delta = controls.getSpherical(new THREE.Spherical(), true).theta - controls.azimuthAngle;
    expect(THREE.MathUtils.radToDeg(delta)).toBeCloseTo(2);
    controls.dispose();
  });

  it('interrupts at the currently rendered pose, including its focal offset', () => {
    const camera = new THREE.PerspectiveCamera();
    const controls = new CameraControls(camera);
    controls.setLookAt(0, 0, 40, 0, 0, 0, false);
    controls.setLookAt(30, 20, 20, 12, 3, 1, true);
    controls.setFocalOffset(4, 2, 0, true);
    controls.update(0.03);
    const position = controls.getPosition(new THREE.Vector3(), false);
    const target = controls.getTarget(new THREE.Vector3(), false);
    const offset = controls.getFocalOffset(new THREE.Vector3(), false);
    freezeCamera(controls);
    controls.update(1);
    expect(controls.getPosition(new THREE.Vector3(), false).distanceTo(position)).toBeLessThan(1e-8);
    expect(controls.getTarget(new THREE.Vector3(), false).distanceTo(target)).toBeLessThan(1e-8);
    expect(controls.getFocalOffset(new THREE.Vector3(), false).distanceTo(offset)).toBeLessThan(1e-8);
    controls.dispose();
  });

  it.each([
    { width: 1440, height: 900, nav: { left: 0, top: 0, width: 1440, height: 64 }, panel: { left: 1006, top: 84, width: 410, height: 700 } },
    { width: 390, height: 844, nav: { left: 0, top: 0, width: 390, height: 56 }, panel: { left: 12, top: 460, width: 366, height: 372 } },
  ])('projects the actual orbit node into the measured centre at $width px', ({ width, height, nav, panel }) => {
    const rect = usableViewport(width, height, nav, panel);
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 420);
    const controls = new CameraControls(camera);
    const point = new THREE.Vector3(12, -8, 3);
    controls.setLookAt(0, 0, 60, 0, 0, 0, false);
    controls.update(1);
    const pose = nodeFocusPose(camera, point, 0.5, height);
    applyCameraPose(controls, pose.position, pose.target, false);
    const offset = viewportFocalOffset(camera, pose.position.distanceTo(pose.target), width, height, rect);
    controls.setFocalOffset(offset.x, offset.y, 0, false);
    controls.update(1);
    camera.updateMatrixWorld();
    const projected = point.clone().project(camera);
    expect((projected.x + 1) * width / 2).toBeCloseTo(rect.left + rect.width / 2, 5);
    expect((1 - projected.y) * height / 2).toBeCloseTo(rect.top + rect.height / 2, 5);
    expect(controls.getTarget(new THREE.Vector3()).distanceTo(point)).toBeLessThan(1e-8);
    controls.dispose();
  });
});
