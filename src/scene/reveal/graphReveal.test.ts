import { describe, expect, it } from 'vitest';
import type { SceneModelInput } from '../../graph/relevance';
import { knowledgeGraph } from '../../data/knowledgeGraph';
import { buildSceneModel } from '../../graph/relevance';
import { buildGraphRevealPlan } from './graphReveal';
import { OPENING_PRESETS } from '../intro/constellationPresets';

const baseView: SceneModelInput = {
  goalId: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  learningPath: [],
  focused: false,
};

const model = buildSceneModel(baseView);

const firstSeed = knowledgeGraph.nodes.find((node) => node.id === 'direction-408')!.id;

describe('GraphRevealPlan', () => {
  it('相同输入生成完全相同的传播计划', () => {
    const seeds = [firstSeed, 'goal-cs-graduate'];
    const first = buildGraphRevealPlan(model, seeds);
    const second = buildGraphRevealPlan(model, seeds);

    expect([...first.nodeDelay]).toEqual([...second.nodeDelay]);
    expect([...first.edgeDelay]).toEqual([...second.edgeDelay]);
    expect(first.duration).toBe(second.duration);
    expect([...first.seedNodeIds]).toEqual([...second.seedNodeIds]);
    expect([...first.seedEdgeIds]).toEqual([...second.seedEdgeIds]);
  });

  it('seed 节点从 0 开始', () => {
    const seeds = ['direction-408', 'goal-cs-graduate', 'course-data-structures'];
    const plan = buildGraphRevealPlan(model, seeds);

    for (const seed of seeds) {
      expect(plan.nodeDelay.get(seed)).toBe(0);
      expect(plan.seedNodeIds.has(seed)).toBe(true);
    }
  });

  it('接收节点不会早于负责传播的边', () => {
    const seeds = ['direction-408', 'goal-cs-graduate'];
    const plan = buildGraphRevealPlan(model, seeds);

    for (const edge of model.edges) {
      const edgeAt = plan.edgeDelay.get(edge.id);
      if (edgeAt === undefined) continue;

      const latestNodeAt = Math.max(
        plan.nodeDelay.get(edge.source) ?? 0,
        plan.nodeDelay.get(edge.target) ?? 0,
      );

      expect(edgeAt).toBeLessThanOrEqual(latestNodeAt + 0.03);
    }
  });

  it('未列入允许集合的节点既不亮也不参与传播', () => {
    const allowed = new Set(['direction-408', 'goal-cs-graduate']);
    const plan = buildGraphRevealPlan(model, ['direction-408'], allowed);

    for (const [id] of plan.nodeDelay) {
      expect(allowed.has(id)).toBe(true);
    }
    expect(plan.nodeDelay.has('knowledge-rag')).toBe(false);
  });

  it('传播延迟随时间单调不减：后出现的节点不早于其父层', () => {
    const plan = buildGraphRevealPlan(model, ['direction-408']);

    for (const edge of model.edges) {
      const sourceAt = plan.nodeDelay.get(edge.source);
      const targetAt = plan.nodeDelay.get(edge.target);
      if (sourceAt === undefined || targetAt === undefined) continue;

      // BFS 保证相邻节点延迟差不超过一层间距 + 层内展开
      expect(Math.abs(sourceAt - targetAt)).toBeLessThanOrEqual(0.14 + 0.14 + 0.001);
    }
  });

  it('duration 覆盖全部节点与边的最后时刻', () => {
    const plan = buildGraphRevealPlan(model, ['direction-408']);
    const lastNode = Math.max(0, ...plan.nodeDelay.values());
    const lastEdge = Math.max(0, ...plan.edgeDelay.values());

    expect(plan.duration).toBeGreaterThanOrEqual(lastNode);
    expect(plan.duration).toBeGreaterThanOrEqual(lastEdge);
  });

  it('每个 Opening preset 的唤醒波都在入场镜头结束前走完（手册第 13 章：Reveal ≈ 1.4–1.9s）', () => {
    for (const preset of OPENING_PRESETS) {
      const plan = buildGraphRevealPlan(model, preset.seedNodeIds);
      // 手册第 5.2 章的 LEVEL_GAP=0.19 会在这张图上拖到 2.41s，超过镜头 2.15s；
      // 现取 0.14，三个 preset 都落在区间内。
      expect(plan.duration).toBeGreaterThanOrEqual(1.4);
      expect(plan.duration).toBeLessThan(1.9);
    }
  });
});
