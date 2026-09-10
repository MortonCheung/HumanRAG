import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { createEntryShot, type CameraPose } from './entryShot';

describe('entry shot handoff', () => {
  it('keeps the exact final pose when the landing route cleans up', () => {
    const from = { position: new Vector3(80, 25, 60), target: new Vector3(-20, 0, 0) };
    const to = { position: new Vector3(30, 40, 70), target: new Vector3(0, 0, 0) };
    const complete = vi.fn();
    let visible: CameraPose = from;
    const timeline = createEntryShot(from, to, (pose) => { visible = { position: pose.position.clone(), target: pose.target.clone() }; }, complete).pause();
    timeline.progress(0.5);
    expect(visible.position.distanceTo(from.position)).toBeGreaterThan(1);
    timeline.progress(1);
    expect(visible.position.distanceTo(to.position)).toBeLessThan(0.00001);
    expect(visible.target.distanceTo(to.target)).toBeLessThan(0.00001);
    timeline.kill();
    expect(visible.position.distanceTo(to.position)).toBeLessThan(0.00001);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('does not rewind or complete when the user interrupts the shot', () => {
    const complete = vi.fn();
    const apply = vi.fn();
    const timeline = createEntryShot({ position: new Vector3(40, 10, 80), target: new Vector3() }, { position: new Vector3(20, 10, 40), target: new Vector3(4, 0, 0) }, apply, complete).pause();
    timeline.progress(0.4);
    const calls = apply.mock.calls.length;
    timeline.kill();
    expect(apply).toHaveBeenCalledTimes(calls);
    expect(complete).not.toHaveBeenCalled();
  });
});
