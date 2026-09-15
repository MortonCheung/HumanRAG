import { describe, expect, it } from 'vitest';
import { buildTreePreviewAnchors, TREE_PREVIEW_ROTATION_SPEED, TREE_RING_MIN_RADIUS, TREE_RING_SPACING, treePreviewAnchor, treePreviewRotation, treeRotationPhase } from './treePreviewLayout';

describe('library preview universe layout', () => {
  it('places one tree in the center and two trees opposite each other', () => {
    expect(treePreviewAnchor(0, 1).toArray()).toEqual([0, 0, 0]);
    const pair = [treePreviewAnchor(0, 2), treePreviewAnchor(1, 2)];
    expect(pair[0].distanceTo(pair[1])).toBeCloseTo(TREE_RING_MIN_RADIUS * 2);
    expect(pair[0].clone().add(pair[1]).length()).toBeCloseTo(0);
  });

  it.each([3, 4, 5, 8])('builds a deterministic %i-tree ring with useful separation', (count) => {
    const ids = Array.from({ length: count }, (_, index) => `tree-${index}`);
    const first = buildTreePreviewAnchors(ids);
    const second = buildTreePreviewAnchors(ids);
    expect([...second].map(([id, point]) => [id, point.toArray()])).toEqual([...first].map(([id, point]) => [id, point.toArray()]));
    expect(first.size).toBe(count);
    for (let index = 0; index < count; index += 1) {
      const current = first.get(ids[index])!;
      const next = first.get(ids[(index + 1) % count])!;
      expect(current.distanceTo(next)).toBeGreaterThanOrEqual(TREE_RING_SPACING - 0.01);
    }
    if (count !== 4) expect([...first.values()].some((point) => Math.abs(point.y) > 0.01)).toBe(true);
  });

  it('derives a repeatable rotation phase from tree identity', () => {
    expect(treeRotationPhase('tree-ai')).toBe(treeRotationPhase('tree-ai'));
    expect(treeRotationPhase('tree-ai')).not.toBe(treeRotationPhase('tree-408'));
    expect(treeRotationPhase('tree-ai')).toBeGreaterThanOrEqual(0);
    expect(treeRotationPhase('tree-ai')).toBeLessThanOrEqual(Math.PI * 2);
    expect(treePreviewRotation('tree-ai', 12, 12)).toBe(treeRotationPhase('tree-ai'));
    expect(treePreviewRotation('tree-ai', 14, 12)).toBeCloseTo(treeRotationPhase('tree-ai') + TREE_PREVIEW_ROTATION_SPEED * 2);
  });
});
