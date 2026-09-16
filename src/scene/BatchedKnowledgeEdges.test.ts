import { describe, expect, it } from 'vitest';
import { buildEdgeGeometry, edgeAlpha, edgeGeometryKey, selectPulsingEdgeIds, synapticPulseShader } from './BatchedKnowledgeEdges';
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
    expect(geometry.getAttribute('aOpeningSeed').count).toBe(positions.count);
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
    expect(synapticPulseShader).toContain('float localTime=uRevealTime-vDelay');
    expect(synapticPulseShader).toContain('float started=step(0.0,localTime)');
    expect(synapticPulseShader).toContain('float grown=started*');
    expect(synapticPulseShader).toContain('max(grown,vOpeningSeed)');
  });
  it('breaks old Universe relations from the middle toward both endpoints', () => {
    expect(synapticPulseShader).toContain('abs(vProgress-0.5)*2.0');
    expect(synapticPulseShader).toContain('smoothstep(uDetach-0.07,uDetach+0.07,centerDistance)');
  });
  it('keeps only seed relations legible before the opening reveal begins', () => {
    const active = { ...model.edges[0], visualState: 'lensActive' as const };
    const hierarchy = { ...model.edges[0], visualState: 'background' as const, relationType: 'hierarchy' as const };
    const related = { ...model.edges[0], visualState: 'background' as const, relationType: 'related' as const };

    expect(edgeAlpha(active, 'intro')).toBeGreaterThanOrEqual(0.25);
    expect(edgeAlpha(active, 'intro')).toBeLessThanOrEqual(0.38);
    expect(edgeAlpha(hierarchy, 'intro')).toBe(0);
    expect(edgeAlpha(related, 'intro')).toBe(0);
    expect(edgeAlpha(hierarchy, 'universe')).toBe(0.16);
    expect(edgeAlpha(related, 'universe')).toBe(0.045);
  });
  it.each(['quality', 'balanced', 'performance'] as const)('keeps %s pulse work within its device budget', (tier) => {
    const ids = selectPulsingEdgeIds(model.edges, QUALITY_CONFIG[tier].activePulseCount);
    expect(ids.size).toBe(QUALITY_CONFIG[tier].activePulseCount);
  });
});
