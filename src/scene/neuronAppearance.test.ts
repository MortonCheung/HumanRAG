import { describe, expect, it } from 'vitest';
import { neuronAppearance } from './neuronAppearance';
import type { NodeType, VisualState } from '../graph/types';

describe('emissive neuron appearance', () => {
  const types: NodeType[] = ['goal', 'direction', 'course', 'skill', 'knowledge', 'practice'];
  const states: VisualState[] = ['dormant', 'contextual', 'selected', 'upstream', 'downstream', 'lateral', 'lensActive', 'recommendedPath', 'searchMatch'];
  it('keeps a luminous nucleus even for dormant nodes, with bounded point sizes', () => {
    for (const type of types) for (const state of states) {
      const appearance = neuronAppearance(type, state);
      expect(appearance.strength).toBeGreaterThanOrEqual(0.7);
      expect(appearance.size).toBeGreaterThanOrEqual(20);
      expect(appearance.size).toBeLessThan(60);
    }
  });
  it('expresses hover and selection through light without mutating base appearance', () => {
    const idle = neuronAppearance('knowledge', 'contextual');
    expect(neuronAppearance('knowledge', 'contextual', true).size).toBeGreaterThan(idle.size);
    expect(neuronAppearance('knowledge', 'selected').strength).toBeGreaterThan(idle.strength);
    expect(neuronAppearance('knowledge', 'contextual')).toEqual(idle);
  });
});
