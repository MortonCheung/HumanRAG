import { describe, expect, it, vi } from 'vitest';
import { knowledgeGraph } from '../../data/knowledgeGraph';
import type { SceneModelInput } from '../../graph/relevance';
import { buildSceneModel } from '../../graph/relevance';
import { buildGraphRevealPlan } from '../reveal/graphReveal';
import { buildIntroScene, OPENING_PRESETS, pickOpeningPreset } from './constellationPresets';

const baseView: SceneModelInput = {
  goalId: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  learningPath: [],
  focused: false,
};

describe('opening presets', () => {
  it('每个 preset 的 seed 都是真实存在的节点', () => {
    const ids = new Set(knowledgeGraph.nodes.map((node) => node.id));
    for (const preset of OPENING_PRESETS) {
      expect(preset.seedNodeIds.length).toBeGreaterThan(0);
      for (const id of preset.seedNodeIds) expect(ids.has(id)).toBe(true);
    }
  });

  it('pickOpeningPreset 在 session 内按顺序轮换，不存在随机', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    });

    const seen: string[] = [];
    for (let index = 0; index <= OPENING_PRESETS.length; index += 1) {
      seen.push(pickOpeningPreset().id);
    }
    vi.unstubAllGlobals();

    // 轮换一周后回到起点
    expect(seen[seen.length - 1]).toBe(seen[0]);
    expect(new Set(seen.slice(0, OPENING_PRESETS.length)).size).toBe(OPENING_PRESETS.length);
  });

  it('intro scene 保留全部节点，坐标原封不动', () => {
    const model = buildSceneModel(baseView);
    const reveal = buildGraphRevealPlan(model, OPENING_PRESETS[0].seedNodeIds);
    const intro = buildIntroScene(model, reveal);
    expect(intro.nodes).toHaveLength(model.nodes.length);
    expect(intro.edges).toHaveLength(model.edges.length);
    for (const node of intro.nodes) {
      const source = model.nodes.find((entry) => entry.id === node.id)!;
      expect(node.displayPosition).toEqual(source.displayPosition);
    }
    for (const seedId of OPENING_PRESETS[0].seedNodeIds) {
      const seed = intro.nodes.find((node) => node.id === seedId)!;
      expect(seed.visualState).toBe('lensActive');
      expect(seed.propagationDelay).toBe(0);
    }
  });

  it('reveal plan 从 seed 出发按图距离传播，且为纯函数', () => {
    const model = buildSceneModel(baseView);
    const first = buildGraphRevealPlan(model, OPENING_PRESETS[1].seedNodeIds);
    const second = buildGraphRevealPlan(model, OPENING_PRESETS[1].seedNodeIds);
    expect(second).toEqual(first);
    expect(first.seedNodeIds.size).toBeGreaterThan(0);
    for (const [id, delay] of first.nodeDelay) {
      if (first.seedNodeIds.has(id)) expect(delay).toBe(0);
      else expect(delay).toBeGreaterThan(0);
    }
    expect(first.duration).toBeGreaterThan(0);
  });
});
