import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTree, migrateV9 } from '../../domain/knowledge/migration';
import { getRegistry } from '../../domain/knowledge/selectors';
import { composeGoalTree, parseGoalQuery } from './GoalTreeComposer';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  });
  migrateV9();
});

describe('GoalTreeComposer', () => {
  it('从自然语言中区分目标、薄弱、已有基础和兴趣', () => {
    expect(parseGoalQuery('我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。')).toMatchObject({
      goalTerms: ['408'],
      weakTerms: ['网络'],
      strongTerms: ['数据结构'],
      interestTerms: ['ai'],
    });
  });

  it('只从 Registry 选择已有节点，并产出稳定、连通且有解释的子图', () => {
    const prompt = '我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。';
    const first = composeGoalTree(prompt);
    const second = composeGoalTree(prompt);
    const registry = getRegistry();
    const selected = new Set(first.pointIds);

    expect(first).toEqual(second);
    expect(first.pointIds.length).toBeGreaterThanOrEqual(8);
    expect(first.pointIds.length).toBeLessThanOrEqual(36);
    expect(first.pointIds.every((id) => registry.points.has(id))).toBe(true);
    expect(first.pointIds).toContain('course-computer-networks');
    expect(first.pointIds).toContain('knowledge-tcp');
    expect(first.pointIds).toContain('course-data-structures');
    expect(Object.keys(first.reasons).sort()).toEqual([...first.pointIds].sort());

    const neighbors = new Map<string, string[]>();
    for (const relation of registry.relations) {
      if (!selected.has(relation.sourcePointId) || !selected.has(relation.targetPointId)) continue;
      neighbors.set(relation.sourcePointId, [...(neighbors.get(relation.sourcePointId) ?? []), relation.targetPointId]);
      neighbors.set(relation.targetPointId, [...(neighbors.get(relation.targetPointId) ?? []), relation.sourcePointId]);
    }
    const visited = new Set<string>();
    const queue = [first.pointIds[0]];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push(...(neighbors.get(id) ?? []).filter((neighbor) => !visited.has(neighbor)));
    }
    expect(visited.size).toBe(first.pointIds.length);
  });

  it('无法命中 Registry 时给出明确失败，不创建臆造节点', () => {
    expect(() => composeGoalTree('火星园艺')).toThrow('还没有找到');
  });

  it('自动生成结果使用普通的用户 KnowledgeTree，不增加 KnowledgePoint', () => {
    const before = migrateV9();
    const existingIds = new Set(before.points.map((point) => point.id));
    const draft = composeGoalTree('准备 408，网络基础比较弱');
    const tree = createTree(before.library.id, {
      identity: { name: '我的 408 路线', description: draft.description, color: '#b1d8ca' },
      pointIds: draft.pointIds,
    });
    const after = migrateV9();

    expect(tree.ownerType).toBe('user');
    expect(tree.pointIds.every((pointId) => existingIds.has(pointId))).toBe(true);
    expect(after.points).toHaveLength(before.points.length);
    expect(after.userTrees).toContainEqual(tree);
    expect(after.library.treeIds).toContain(tree.id);
  });
});
