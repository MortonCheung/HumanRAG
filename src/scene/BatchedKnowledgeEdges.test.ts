import { describe, expect, it } from 'vitest';
import {
  buildOpeningEdgeTimeline,
  buildOpeningEdgeTiming,
  buildEdgeGeometry,
  edgeAlpha,
  edgeGeometryKey,
  edgeVertexShader,
  nodeReadyAt,
  OPENING_EDGE_BUILD_MAX_SECONDS,
  OPENING_EDGE_BUILD_MIN_SECONDS,
  OPENING_EDGE_QUEUE_MAX_SECONDS,
  OPENING_EDGE_QUEUE_MIN_SECONDS,
  OPENING_NODE_FADE_SECONDS,
  openingEdgeRevealMask,
  openingPulseGate,
  selectPulsingEdgeIds,
  synapticPulseShader,
} from './BatchedKnowledgeEdges';
import { QUALITY_CONFIG } from '../performance/qualityPolicy';
import { buildSceneModel } from '../graph/relevance';
import { buildGraphRevealPlan } from './reveal/graphReveal';
import { OPENING_PRESETS } from './intro/constellationPresets';

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
    expect(geometry.getAttribute('aDelay').count).toBe(positions.count);
    expect(geometry.getAttribute('aRevealDuration').count).toBe(positions.count);
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
  it('uses per-edge timing and grows every relation symmetrically from both endpoints', () => {
    expect(edgeVertexShader).toContain('aDelay');
    expect(edgeVertexShader).toContain('aRevealDuration');
    expect(synapticPulseShader).toContain('uOpeningElapsed');
    expect(synapticPulseShader).toContain('abs(vProgress - 0.5)');
    expect(synapticPulseShader).toContain('started*step(0.999,local)');
    expect(edgeVertexShader).not.toContain('vScreenY');
    expect(synapticPulseShader).not.toContain('vScreenY');
    expect(synapticPulseShader).not.toContain('sweepHead');
    expect(synapticPulseShader).not.toContain('uLineReveal');

    const timing = buildOpeningEdgeTiming('edge-mask', 0.2, 0.4);
    expect(openingEdgeRevealMask(timing.startAt - 0.001, timing, 0)).toBe(0);
    expect(openingEdgeRevealMask(timing.startAt - 0.001, timing, 1)).toBe(0);
    const halfway = timing.startAt + timing.buildDuration / 2;
    expect(openingEdgeRevealMask(halfway, timing, 0.2)).toBeCloseTo(openingEdgeRevealMask(halfway, timing, 0.8));
    expect(openingEdgeRevealMask(timing.endAt, timing, 0.5)).toBe(1);
  });

  it('waits for both endpoint nodes, then applies deterministic bounded queue and build timing', () => {
    expect(nodeReadyAt(0)).toBe(0);
    expect(nodeReadyAt(0.4)).toBeCloseTo(0.4 + OPENING_NODE_FADE_SECONDS);

    const first = buildOpeningEdgeTiming('edge-a', 0.2, 0.7);
    const repeated = buildOpeningEdgeTiming('edge-a', 0.2, 0.7);
    const different = buildOpeningEdgeTiming('edge-b', 0.2, 0.7);
    expect(first).toEqual(repeated);
    expect([different.queueDelay, different.buildDuration]).not.toEqual([first.queueDelay, first.buildDuration]);
    expect(first.eligibleAt).toBeCloseTo(Math.max(nodeReadyAt(0.2), nodeReadyAt(0.7)));
    expect(first.startAt).toBeGreaterThanOrEqual(first.sourceReadyAt);
    expect(first.startAt).toBeGreaterThanOrEqual(first.targetReadyAt);
    expect(first.queueDelay).toBeGreaterThanOrEqual(OPENING_EDGE_QUEUE_MIN_SECONDS);
    expect(first.queueDelay).toBeLessThanOrEqual(OPENING_EDGE_QUEUE_MAX_SECONDS);
    expect(first.buildDuration).toBeGreaterThanOrEqual(OPENING_EDGE_BUILD_MIN_SECONDS);
    expect(first.buildDuration).toBeLessThanOrEqual(OPENING_EDGE_BUILD_MAX_SECONDS);
  });

  it('lets seed-to-seed relations queue immediately without waiting for node fade', () => {
    const timing = buildOpeningEdgeTiming('seed-edge', 0, 0);
    expect(timing.sourceReadyAt).toBe(0);
    expect(timing.targetReadyAt).toBe(0);
    expect(timing.eligibleAt).toBe(0);
    expect(timing.startAt).toBeGreaterThanOrEqual(OPENING_EDGE_QUEUE_MIN_SECONDS);
  });

  it('derives the pulse gate from the last completed edge and stays inside the 2.70s handoff', () => {
    for (const preset of OPENING_PRESETS) {
      const reveal = buildGraphRevealPlan(model, preset.seedNodeIds);
      const openingModel = {
        ...model,
        nodes: model.nodes.map((node) => ({
          ...node,
          propagationDelay: reveal.nodeDelay.get(node.id) ?? reveal.duration,
        })),
      };
      const timeline = buildOpeningEdgeTimeline(openingModel);
      const timings = [...timeline.edgeTimings.values()];
      expect(timeline.networkReadyAt).toBeCloseTo(Math.max(...timings.map((timing) => timing.endAt)));
      for (const timing of timings) {
        expect(timing.startAt).toBeGreaterThanOrEqual(timing.sourceReadyAt);
        expect(timing.startAt).toBeGreaterThanOrEqual(timing.targetReadyAt);
        expect(timing.queueDelay).toBeGreaterThanOrEqual(OPENING_EDGE_QUEUE_MIN_SECONDS);
        expect(timing.queueDelay).toBeLessThanOrEqual(OPENING_EDGE_QUEUE_MAX_SECONDS);
        expect(timing.buildDuration).toBeGreaterThanOrEqual(OPENING_EDGE_BUILD_MIN_SECONDS);
        expect(timing.buildDuration).toBeLessThanOrEqual(OPENING_EDGE_BUILD_MAX_SECONDS);
      }
      expect(openingPulseGate(timeline, timeline.networkReadyAt)).toBe(0);
      expect(openingPulseGate(timeline, timeline.pulseStart)).toBe(0);
      expect(openingPulseGate(timeline, timeline.pulseEnd)).toBe(1);
      expect(timeline.pulseEnd).toBeLessThan(2.70);
    }
  });

  it('fails clearly when an edge endpoint is missing instead of revealing it early', () => {
    const firstEdge = model.edges[0];
    expect(() => buildOpeningEdgeTimeline({
      nodes: model.nodes.filter((node) => node.id !== firstEdge.source),
      edges: [firstEdge],
    })).toThrow(/missing endpoint/);
  });
  it('breaks old Universe relations from the middle toward both endpoints', () => {
    expect(synapticPulseShader).toContain('abs(vProgress - 0.5)*2.0');
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
