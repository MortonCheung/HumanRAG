import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { easeOutCubic, picoFlightControl, picoNodeTarget, quadraticBezier } from './picoTravel';

describe('Pico Universe travel', () => {
  it('quadratic Bezier keeps exact endpoints and lifts through its control point', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(4, 0, 0);
    const control = picoFlightControl(start, end, new THREE.Vector3(0, 1, 0));
    expect(quadraticBezier(start, control, end, 0).toArray()).toEqual([0, 0, 0]);
    expect(quadraticBezier(start, control, end, 1).toArray()).toEqual([4, 0, 0]);
    expect(quadraticBezier(start, control, end, 0.5).y).toBeCloseTo(1.1);
  });

  it('places Pico at camera-right plus up using the node radius', () => {
    const target = picoNodeTarget(
      new THREE.Vector3(1, 2, 3),
      0.8,
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 1, 0),
    );
    expect(target.toArray()).toEqual([3, 2.9, 3]);
  });

  it('decelerates near arrival', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(1)).toBe(1);
  });
});
