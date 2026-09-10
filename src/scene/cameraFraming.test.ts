import { describe, expect, it } from 'vitest';
import { framingCorrection } from './cameraFraming';
import { nodeFocusPose } from './cameraFraming';
import { PerspectiveCamera, Vector3 } from 'three';

describe('camera framing without moving the graph', () => {
  it('leaves a comfortably visible target untouched', () => {
    expect(framingCorrection(-0.2, 0.2, 0.8, 1440, 900)).toEqual({ kind: 'visible', x: -0.2, y: 0.2 });
  });
  it('minimally shifts a target under the inspector, preserving the other axis', () => {
    const result = framingCorrection(0.7, 0.1, 0.8, 1440, 900);
    expect(result.kind).toBe('edge');
    expect(result.x).toBeCloseTo(1 - 948 / 1440);
    expect(result.y).toBe(0.1);
  });
  it('flies to targets behind the camera', () => {
    expect(framingCorrection(0.1, 0, 1.1, 1440, 900).kind).toBe('distant');
  });
  it('reserves the bottom sheet on a phone', () => {
    expect(framingCorrection(0, -0.4, 0.8, 390, 844)).toEqual({ kind: 'edge', x: 0, y: 0.08 });
  });

  it.each([[1440, 900], [390, 844]])('centres the selected node exactly at %s × %s', (width, height) => {
    const camera = new PerspectiveCamera(44, width / height, 0.1, 420);
    camera.position.set(0, 0, 150);
    camera.lookAt(0, 0, 0);
    const point = new Vector3(12, -8, 3);
    const pose = nodeFocusPose(camera, point, 0.5, height);
    expect(pose.target.equals(point)).toBe(true);
    expect(pose.position.distanceTo(point)).toBeLessThan(50);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    camera.updateMatrixWorld();
    const projected = point.clone().project(camera);
    expect(projected.x).toBeCloseTo(0, 8);
    expect(projected.y).toBeCloseTo(0, 8);
    const repeated = nodeFocusPose(camera, point, 0.5, height);
    expect(repeated.position.distanceTo(camera.position)).toBeLessThan(0.00001);
  });

  it('also centres an already readable off-centre node without pushing the camera away', () => {
    const camera = new PerspectiveCamera(44, 1.6, 0.1, 420);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    const point = new Vector3(4, 1, 0);
    const pose = nodeFocusPose(camera, point, 1.8, 900);
    expect(pose.target.equals(point)).toBe(true);
    expect(pose.position.distanceTo(point)).toBeCloseTo(camera.position.distanceTo(point));
  });
});
