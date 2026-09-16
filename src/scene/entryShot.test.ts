import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import {
  createEntryShot,
  ENTRY_AZIMUTH_ORBIT_DEGREES,
  ENTRY_CAMERA_MOTION_DURATION,
  ENTRY_SHOT_DURATION,
  introOrbitDirection,
  type CameraPose,
} from './entryShot';

function azimuthDegrees(direction: Vector3) {
  return (Math.atan2(direction.x, direction.z) * 180) / Math.PI;
}

function azimuthDeltaDegrees(from: Vector3, to: Vector3) {
  const delta = azimuthDegrees(to) - azimuthDegrees(from);
  return Math.abs(((delta + 540) % 360) - 180);
}

describe('entry shot handoff', () => {
  it('orbits visibly around world Y, lands exactly, then holds until handoff', () => {
    const from = { position: new Vector3(80, 25, 60), target: new Vector3(-20, 0, 0) };
    const toTarget = new Vector3(4, 0, 2);
    const toDistance = 33;
    const direction = from.position.clone().sub(from.target).normalize();
    const finalDirection = direction.clone().applyAxisAngle(new Vector3(0, 1, 0), (ENTRY_AZIMUTH_ORBIT_DEGREES * Math.PI) / 180);
    const finalPosition = finalDirection.clone().multiplyScalar(toDistance).add(toTarget);
    const complete = vi.fn();
    let visible: CameraPose = from;
    const timeline = createEntryShot(from, toTarget, toDistance, (pose) => { visible = { position: pose.position.clone(), target: pose.target.clone() }; }, complete).pause();
    expect(timeline.duration()).toBeCloseTo(ENTRY_SHOT_DURATION);
    timeline.time(ENTRY_CAMERA_MOTION_DURATION / 2);
    expect(visible.position.distanceTo(from.position)).toBeGreaterThan(1);
    const midDirection = visible.position.clone().sub(visible.target).normalize();
    expect(azimuthDeltaDegrees(direction, midDirection)).toBeGreaterThan(35);
    timeline.time(ENTRY_CAMERA_MOTION_DURATION);
    expect(azimuthDeltaDegrees(direction, visible.position.clone().sub(visible.target).normalize())).toBeCloseTo(ENTRY_AZIMUTH_ORBIT_DEGREES, 5);
    expect(visible.position.distanceTo(finalPosition)).toBeLessThan(0.00001);
    expect(visible.target.distanceTo(toTarget)).toBeLessThan(0.00001);
    const settled = { position: visible.position.clone(), target: visible.target.clone() };
    timeline.time(ENTRY_CAMERA_MOTION_DURATION + 0.25);
    expect(visible.position.distanceTo(settled.position)).toBeLessThan(0.00001);
    expect(visible.target.distanceTo(settled.target)).toBeLessThan(0.00001);
    expect(complete).not.toHaveBeenCalled();
    timeline.progress(1);
    timeline.kill();
    expect(visible.position.distanceTo(finalPosition)).toBeLessThan(0.00001);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('keeps the intro orbit small, bounded, and periodic', () => {
    const direction = new Vector3(0.68, 0.38, 0.76).normalize();
    const start = introOrbitDirection(direction, 0);
    const quarter = introOrbitDirection(direction, 2.5);
    const half = introOrbitDirection(direction, 5);
    const end = introOrbitDirection(direction, 10);

    expect(azimuthDeltaDegrees(start, quarter)).toBeLessThan(5);
    expect(start.angleTo(quarter) * 180 / Math.PI).toBeGreaterThan(1);
    expect(start.angleTo(half) * 180 / Math.PI).toBeLessThan(3);
    expect(start.angleTo(end)).toBeLessThan(0.000001);
  });

  it('does not rewind or complete when the user interrupts the shot', () => {
    const complete = vi.fn();
    const apply = vi.fn();
    const timeline = createEntryShot({ position: new Vector3(40, 10, 80), target: new Vector3() }, new Vector3(4, 0, 0), 50, apply, complete).pause();
    timeline.progress(0.4);
    const calls = apply.mock.calls.length;
    timeline.kill();
    expect(apply).toHaveBeenCalledTimes(calls);
    expect(complete).not.toHaveBeenCalled();
  });
});
