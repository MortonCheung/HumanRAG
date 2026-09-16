import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { createEntryShot, ENTRY_CAMERA_MOTION_DURATION, ENTRY_SHOT_DURATION, type CameraPose } from './entryShot';

describe('entry shot handoff', () => {
  it('keeps the view direction fixed and lands on the exact final pose', () => {
    const from = { position: new Vector3(80, 25, 60), target: new Vector3(-20, 0, 0) };
    const toTarget = new Vector3(4, 0, 2);
    const toDistance = 33;
    const direction = from.position.clone().sub(from.target).normalize();
    const finalPosition = direction.clone().multiplyScalar(toDistance).add(toTarget);
    const complete = vi.fn();
    let visible: CameraPose = from;
    const timeline = createEntryShot(from, toTarget, toDistance, (pose) => { visible = { position: pose.position.clone(), target: pose.target.clone() }; }, complete).pause();
    expect(timeline.duration()).toBeCloseTo(ENTRY_SHOT_DURATION);
    timeline.progress(0.5);
    expect(visible.position.distanceTo(from.position)).toBeGreaterThan(1);
    // The shot never orbits: the view direction must stay within 0.5 degrees of
    // the incoming direction for the whole interpolation. cos(0.5deg) = 0.99996.
    const midAngleDeg =
      (Math.acos(
        Math.min(1, visible.position.clone().sub(visible.target).normalize().dot(direction)),
      ) *
        180) /
      Math.PI;
    expect(midAngleDeg).toBeLessThan(0.5);
    timeline.time(ENTRY_CAMERA_MOTION_DURATION + 0.25);
    expect(visible.position.distanceTo(finalPosition)).toBeLessThan(0.00001);
    expect(visible.target.distanceTo(toTarget)).toBeLessThan(0.00001);
    expect(complete).not.toHaveBeenCalled();
    timeline.progress(1);
    timeline.kill();
    expect(visible.position.distanceTo(finalPosition)).toBeLessThan(0.00001);
    expect(complete).toHaveBeenCalledTimes(1);
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
