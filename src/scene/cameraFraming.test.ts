// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import CameraControls from 'camera-controls';
import * as THREE from 'three';
import { applyCameraPose, freezeCamera, introCameraDistance, nodeFocusPose, SPATIAL_CAMERA_FOV, viewportFocalOffset } from './cameraFraming';
import { usableViewport } from '../features/spatial/SpatialViewport';
import { buildSceneModel } from '../graph/relevance';
import type { SceneModelInput } from '../graph/relevance';
import { OPENING_PRESETS } from './intro/constellationPresets';
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

describe('Opening 取景（手册第 10 章 / 第 13 章）', () => {
  const baseView: SceneModelInput = { goalId: null, selectedNodeId: null, hoveredNodeId: null, learningPath: [], focused: false };
  const model = buildSceneModel(baseView);
  const preset = OPENING_PRESETS[0];
  const seedPoints = model.nodes
    .filter((node) => preset.seedNodeIds.includes(node.id))
    .map((node) => new THREE.Vector3(...node.displayPosition));
  const seedSphere = new THREE.Box3().setFromPoints(seedPoints).getBoundingSphere(new THREE.Sphere());

  it('intro 距离按手册乘数 3.1 计算，且不被上限截断', () => {
    expect(seedPoints.length).toBe(preset.seedNodeIds.length);
    expect(seedSphere.radius).toBeGreaterThan(10);
    // 手册上限 46 会截断这枚距离（实测 seed 簇需要约 61），是"顶栏压住 seed / 移动端溢出"的根因。
    expect(introCameraDistance(seedSphere.radius)).toBeGreaterThan(46);
    expect(introCameraDistance(seedSphere.radius)).toBeCloseTo(seedSphere.radius * 3.1, 6);
  });

  it.each([
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ])('$width × $height 下 seed 全部落在画面内且不压住顶栏', ({ width, height }) => {
    const navHeight = 64;
    const camera = new THREE.PerspectiveCamera(SPATIAL_CAMERA_FOV, width / height, 0.1, 420);
    camera.position.copy(
      seedSphere.center.clone()
        .addScaledVector(new THREE.Vector3(0.68, 0.38, 0.76).normalize(), introCameraDistance(seedSphere.radius)),
    );
    camera.lookAt(seedSphere.center);
    camera.updateMatrixWorld(true);

    let top = height;
    for (const point of seedPoints) {
      const ndc = point.clone().project(camera);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
      top = Math.min(top, ((1 - ndc.y) / 2) * height);
    }
    expect(top).toBeGreaterThan(navHeight);
  });
});
