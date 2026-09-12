import { describe, expect, it } from 'vitest';
import { buildTreePreviewAnchors, TREE_PREVIEW_ROTATION_SPEED, TREE_PREVIEW_SPACING, treePreviewAnchor, treePreviewRotation, treeRotationPhase } from './treePreviewLayout';

describe('library preview universe layout', () => {
  it('keeps library order on stable, evenly spaced anchors', () => {
    const anchors = buildTreePreviewAnchors(['tree-408', 'tree-ai', 'tree-frontend']);
    expect(anchors.get('tree-408')?.toArray()).toEqual([0, 0, 0]);
    expect(anchors.get('tree-ai')?.toArray()).toEqual([TREE_PREVIEW_SPACING, 0, 0]);
    expect(anchors.get('tree-frontend')?.toArray()).toEqual([TREE_PREVIEW_SPACING * 2, 0, 0]);
    expect(treePreviewAnchor(2).x - treePreviewAnchor(1).x).toBe(TREE_PREVIEW_SPACING);
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
