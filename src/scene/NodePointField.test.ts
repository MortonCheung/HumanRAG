import { describe, expect, it } from 'vitest';
import { formationPosition, formationProgress, openingNodeVisibility } from './NodePointField';

describe('opening node visibility', () => {
  it('keeps non-seed nodes completely dark for however long Intro remains open', () => {
    expect(openingNodeVisibility('intro', 0, 30)).toBe(1);
    expect(openingNodeVisibility('intro', 0.4, 0)).toBe(0);
    expect(openingNodeVisibility('intro', 0.4, 30)).toBe(0);
  });

  it('only lights a node after Awakening reaches its propagation delay', () => {
    expect(openingNodeVisibility('awakening', 0.4, 0.39)).toBe(0);
    expect(openingNodeVisibility('awakening', 0.4, 0.46)).toBeGreaterThan(0);
    expect(openingNodeVisibility('awakening', 0.4, 0.52)).toBe(1);
    expect(openingNodeVisibility('universe', 0.4, 0)).toBe(1);
  });
});

describe('goal tree formation motion', () => {
  it('stagger starts later nodes later and still completes every node', () => {
    expect(formationProgress(0.1, 0.4)).toBeLessThan(formationProgress(0.1, 0));
    expect(formationProgress(1, 0)).toBe(1);
    expect(formationProgress(1, 4)).toBe(1);
  });

  it('uses the exact endpoints with only a subtle vertical lift in between', () => {
    const from: [number, number, number] = [1, 2, 3];
    const to: [number, number, number] = [11, 8, -2];
    expect(formationPosition(from, to, 0)).toEqual(from);
    expect(formationPosition(from, to, 1)).toEqual(to);
    const middle = formationPosition(from, to, 0.5);
    expect(middle[0]).toBeCloseTo(6);
    expect(middle[1]).toBeCloseTo(6.8);
    expect(middle[2]).toBeCloseTo(0.5);
  });
});
