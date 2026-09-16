import { describe, expect, it } from 'vitest';
import {
  buildEdgeGeometry,
  edgeAlpha,
  edgeGeometryKey,
  edgeVertexShader,
  lineRevealMask,
  openingLineState,
  selectPulsingEdgeIds,
  synapticPulseShader,
} from './BatchedKnowledgeEdges';
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
    expect(synapticPulseShader).toContain('fract(uTime*0.21+vPhase)');
    expect(synapticPulseShader).toContain('head-directed');
    expect(synapticPulseShader).toContain('behind/0.032');
    expect(synapticPulseShader).toContain('max(behind,0.0)*18.0');
    expect(synapticPulseShader).toContain('tail*0.46');
    expect(synapticPulseShader).toContain('pulse*0.86+breathing');
    expect(synapticPulseShader).toContain('sin(uTime*1.1+vPhase*6.283)');
    expect(synapticPulseShader).not.toContain('gl_PointCoord');
    expect(synapticPulseShader).toContain('uMotion*uPulseGate');
    expect(synapticPulseShader).not.toContain('localTime');
    expect(synapticPulseShader).not.toContain('grown');
  });
  it('reveals the whole line network with one top-to-bottom screen-space mask', () => {
    expect(edgeVertexShader).toContain('vScreenY=clip.y/clip.w');
    expect(synapticPulseShader).toContain('(vPhase-0.5)*0.12*(1.0-uLineReveal)');
    expect(synapticPulseShader).toContain('mix(1.15,-1.15,uLineReveal)+phaseStagger');
    expect(synapticPulseShader).toContain('uOpening>0.5?lineMask:1.0');
    expect(lineRevealMask(0, 1)).toBe(0);
    expect(lineRevealMask(0, -1)).toBe(0);
    expect(lineRevealMask(0.5, 0.75)).toBe(1);
    expect(lineRevealMask(0.5, -0.75)).toBe(0);
    expect(lineRevealMask(1, 1)).toBe(1);
    expect(lineRevealMask(1, -1)).toBe(1);
    expect(lineRevealMask(0, 1, undefined, 0)).toBe(0);
    expect(lineRevealMask(0, -1, undefined, 1)).toBe(0);
    expect(lineRevealMask(1, 1, undefined, 0)).toBe(1);
    expect(lineRevealMask(1, -1, undefined, 1)).toBe(1);
    expect(lineRevealMask(0.5, 0.04, undefined, 0)).not.toBe(lineRevealMask(0.5, 0.04, undefined, 1));
  });
  it('waits for the last node, then sweeps lines before opening the pulse gate', () => {
    const nodes = [{ propagationDelay: 0 }, { propagationDelay: 1.68 }];
    const before = openingLineState(nodes, 1.89);
    expect(before.nodeRevealEnd).toBeCloseTo(1.8);
    expect(before.lineRevealStart).toBeCloseTo(1.9);
    expect(before.lineReveal).toBe(0);
    expect(before.pulseGate).toBe(0);

    const during = openingLineState(nodes, 2.21);
    expect(during.lineReveal).toBeCloseTo(0.5);
    expect(during.pulseGate).toBe(0);

    const swept = openingLineState(nodes, 2.52);
    expect(swept.lineReveal).toBe(1);
    expect(swept.pulseGate).toBe(0);
    expect(openingLineState(nodes, 2.60).pulseGate).toBeGreaterThan(0);
    expect(openingLineState(nodes, 2.67).pulseGate).toBe(1);
  });
  it('breaks old Universe relations from the middle toward both endpoints', () => {
    expect(synapticPulseShader).toContain('abs(vProgress-0.5)*2.0');
    expect(synapticPulseShader).toContain('smoothstep(uDetach-0.07,uDetach+0.07,centerDistance)');
  });
  it('hides every relation during intro and preserves Universe alpha', () => {
    const active = { ...model.edges[0], visualState: 'lensActive' as const };
    const hierarchy = { ...model.edges[0], visualState: 'background' as const, relationType: 'hierarchy' as const };
    const related = { ...model.edges[0], visualState: 'background' as const, relationType: 'related' as const };

    expect(edgeAlpha(active, 'intro')).toBe(0);
    expect(edgeAlpha(hierarchy, 'intro')).toBe(0);
    expect(edgeAlpha(related, 'intro')).toBe(0);
    expect(edgeAlpha(active, 'universe')).toBe(0.45);
    expect(edgeAlpha(hierarchy, 'universe')).toBe(0.16);
    expect(edgeAlpha(related, 'universe')).toBe(0.045);
  });
  it.each(['quality', 'balanced', 'performance'] as const)('keeps %s pulse work within its device budget', (tier) => {
    const ids = selectPulsingEdgeIds(model.edges, QUALITY_CONFIG[tier].activePulseCount);
    expect(ids.size).toBe(QUALITY_CONFIG[tier].activePulseCount);
  });
});
