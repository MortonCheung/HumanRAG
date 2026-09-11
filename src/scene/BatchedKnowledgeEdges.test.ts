import { describe, expect, it } from 'vitest';
import { buildEdgeGeometry, edgeGeometryKey, selectPulsingEdgeIds, synapticPulseShader } from './BatchedKnowledgeEdges';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';
import { buildSceneModel } from '../graph/relevance';

describe('synaptic geometry and render clock', () => {
  const model = buildSceneModel({ goalId: null, selectedNodeId: null, hoveredNodeId: null, learningPath: [], focused: false });
  it('reuses the actual edge endpoints with one continuous progress coordinate', () => {
    const geometry = buildEdgeGeometry(model, 6);
    const positions = geometry.getAttribute('position');
    const progress = geometry.getAttribute('aProgress');
    const source = model.nodes.find((node) => node.id === model.edges[0].source)!;
    expect([positions.getX(0), positions.getY(0), positions.getZ(0)]).toEqual(source.displayPosition.map(Math.fround));
    expect(progress.getX(0)).toBe(0);
    expect(progress.getX(11)).toBe(1);
    expect(positions.count).toBe(model.edges.length * 12);
    geometry.dispose();
  });
  it('invalidates same-sized topology/position changes, but not appearance', () => {
    const changed = { ...model, nodes: model.nodes.map((node, index) => index ? node : { ...node, displayPosition: [1, 2, 3] as [number, number, number] }) };
    expect(edgeGeometryKey(changed)).not.toBe(edgeGeometryKey(model));
    expect(edgeGeometryKey({ ...model, edges: model.edges.map((edge) => ({ ...edge, visualState: 'path' as const })) })).toBe(edgeGeometryKey(model));
  });
  it('evaluates energy along path progress rather than moving point geometry', () => {
    expect(synapticPulseShader).toContain('fract(uTime*0.18+vPhase)');
    expect(synapticPulseShader).toContain('head-directed');
    expect(synapticPulseShader).not.toContain('gl_PointCoord');
  });
  it.each(['quality', 'balanced', 'performance'] as const)('keeps %s pulse work within its device budget', (tier) => {
    const ids = selectPulsingEdgeIds(model.edges, QUALITY_CONFIG[tier].activePulseCount);
    expect(ids.size).toBe(QUALITY_CONFIG[tier].activePulseCount);
  });
});
