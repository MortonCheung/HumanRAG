import { describe, expect, it } from 'vitest';
import { knowledgeGraph } from '../../data/knowledgeGraph';
import { buildSceneModel } from '../../graph/relevance';
import { buildConstellationScene, CONSTELLATION_PRESETS, pickIntroSubgraph, withAwakeningDelays } from './constellationPresets';

describe('constellation opening', () => {
  it.each(CONSTELLATION_PRESETS)('maps only a real connected subgraph to $id', (preset) => {
    const result = pickIntroSubgraph(preset, knowledgeGraph, 'direction-408');
    expect(result.nodeIds).toHaveLength(preset.points.length);
    const reached = new Set([result.nodeIds[0]]);
    for (let pass = 0; pass < result.nodeIds.length; pass += 1) {
      for (const edge of result.edges) {
        if (reached.has(edge.source)) reached.add(edge.target);
        if (reached.has(edge.target)) reached.add(edge.source);
      }
    }
    expect(reached).toEqual(new Set(result.nodeIds));
    expect(result.edges.every((edge) => knowledgeGraph.edges.includes(edge))).toBe(true);
  });

  it('propagates from the visible constellation into the complete model', () => {
    const model = buildSceneModel({ goalId: null, selectedNodeId: null, hoveredNodeId: null, learningPath: [], focused: false });
    const intro = buildConstellationScene(model, CONSTELLATION_PRESETS[0], 'direction-408');
    const awakening = withAwakeningDelays(model, intro.nodes.map((node) => node.id));
    expect(intro.nodes).toHaveLength(CONSTELLATION_PRESETS[0].points.length);
    expect(awakening.nodes).toHaveLength(model.nodes.length);
    expect(Math.max(...awakening.nodes.map((node) => node.propagationDelay))).toBeGreaterThan(0);
  });
});
