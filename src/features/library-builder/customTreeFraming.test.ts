import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { customTreeFrame } from './customTreeFraming';

describe('custom tree preview framing', () => {
  it.each([[828, 440], [390, 420], [320, 720]])('keeps an off-centre tree inside %s × %s while orbiting', (width, height) => {
    const positions = new Map<string, [number, number, number]>([
      ['root', [80, 120, -60]], ['left', [60, 80, -70]], ['right', [100, 80, -50]],
    ]);
    const pose = customTreeFrame(positions, width, height, true);
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 420);
    for (let step = 0; step < 8; step++) {
      camera.position.copy(pose.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), step * Math.PI / 4);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld();
      for (const point of positions.values()) {
        const screen = new THREE.Vector3(...point).add(pose.offset).project(camera);
        expect(Math.abs(screen.x)).toBeLessThan(1);
        expect(Math.abs(screen.y)).toBeLessThan(1);
        expect(screen.z).toBeLessThan(1);
      }
    }
  });
});
