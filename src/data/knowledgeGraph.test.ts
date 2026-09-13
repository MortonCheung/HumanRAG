import { describe, expect, it } from 'vitest';
import { buildEdgeCurve } from '../graph/curves';
import { buildSceneModel } from '../graph/relevance';
import { buildCausalCorridor } from '../graph/causalCorridor';
import { validateKnowledgeGraph } from '../graph/validation';
import { DEFAULT_408_PATH, knowledgeGraph, matchGoal, nodesById } from './knowledgeGraph';

describe('knowledge universe graph', () => {
  it('contains the V4 computer science knowledge slice', () => {
    expect(knowledgeGraph.nodes).toHaveLength(336);
    for (const branchId of ['408', 'ai', 'game', 'frontend']) {
      expect(knowledgeGraph.nodes.filter((node) => node.branchId === branchId).length).toBeGreaterThan(70);
    }
  });

  it('does not contain dangling edges', () => {
    for (const edge of knowledgeGraph.edges) {
      expect(nodesById.has(edge.source)).toBe(true);
      expect(nodesById.has(edge.target)).toBe(true);
    }
  });

  it('matches the demo target without activating another branch', () => {
    expect(matchGoal('计算机考研408')).toMatchObject({ status: 'matched', nodeId: 'direction-408' });
    expect(matchGoal('我要成为游戏开发工程师')).toMatchObject({ status: 'matched', nodeId: 'direction-game-development' });
    expect(matchGoal('我想学习')).toMatchObject({ status: 'unmatched', nodeId: null });
  });

  it('keeps the default 408 learning path legal', () => {
    expect(DEFAULT_408_PATH.length).toBe(18);
    expect(DEFAULT_408_PATH.every((nodeId) => nodesById.has(nodeId))).toBe(true);
  });

  it('passes structural graph validation', () => {
    expect(validateKnowledgeGraph(knowledgeGraph)).toEqual([]);
  });

  it('keeps base positions immutable while projecting a focused branch', () => {
    const original = knowledgeGraph.nodes.map((node) => [...node.basePosition]);
    const model = buildSceneModel({
      goalId: 'direction-408',
      selectedNodeId: 'knowledge-linear-list',
      hoveredNodeId: null,
      learningPath: DEFAULT_408_PATH,
      focused: true,
    });
    expect(knowledgeGraph.nodes.map((node) => node.basePosition)).toEqual(original);
    expect(model.nodes.find((node) => node.id === 'knowledge-linear-list')?.visualState).toBe('selected');
    expect(model.nodes.find((node) => node.id === 'direction-ai-engineering')?.visualState).toBe('dormant');
    for (const edgeId of model.learningPathEdgeIds) expect(knowledgeGraph.edges.some((edge) => edge.id === edgeId)).toBe(true);
  });

  it('carries the same learning state into the spatial model without changing relevance', () => {
    const baseline = buildSceneModel({ goalId: 'direction-408', selectedNodeId: null, hoveredNodeId: null, learningPath: [], focused: true });
    const learningStates = new Map([['knowledge-tcp', 'needs-verification' as const]]);
    const withEvidence = buildSceneModel({ goalId: 'direction-408', selectedNodeId: null, hoveredNodeId: null, learningPath: [], focused: true, learningStates });
    const before = baseline.nodes.find((node) => node.id === 'knowledge-tcp');
    const after = withEvidence.nodes.find((node) => node.id === 'knowledge-tcp');
    expect(after?.learningState).toBe('needs-verification');
    expect(after?.relevance).toBe(before?.relevance);
    expect(after?.displayPosition).toEqual(before?.displayPosition);
  });

  it('traces prerequisite ancestors and unlocked practice descendants', () => {
    const corridor = buildCausalCorridor('knowledge-linear-list');
    expect(corridor.upstreamNodeDepth.has('course-data-structures')).toBe(true);
    expect(corridor.downstreamNodeDepth.has('practice-linked-list')).toBe(true);
    expect(corridor.primaryEdgeIds.size).toBeGreaterThan(1);
  });

  it('builds deterministic curves with exact endpoints', () => {
    const edge = knowledgeGraph.edges[0];
    const curveA = buildEdgeCurve(edge, [1, 2, 3], [7, -4, 6]);
    const curveB = buildEdgeCurve(edge, [1, 2, 3], [7, -4, 6]);
    expect(curveA.getPoint(0).toArray()).toEqual([1, 2, 3]);
    expect(curveA.getPoint(1).toArray()).toEqual([7, -4, 6]);
    expect(curveA.getPoint(0.5).toArray()).toEqual(curveB.getPoint(0.5).toArray());
  });
});
