import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeTreeName,
  checkDuplicateTreeName,
  generateAnonymousTreeName,
  resolveGoalTreeTarget,
  migrateV9, createTree, createPoint, hydratePointDraft, savePointDraft,
  updatePoint, deletePoint, V9_STORAGE_KEY,
} from './migration';
import type { KnowledgeTree, PointDraft } from './types';

beforeEach(() => {
  // localStorage not available in test env; migration falls back to graph build
});

describe('normalizeTreeName', () => {
  it('trims and lowercases Chinese', () => {
    expect(normalizeTreeName('  前端开发  ')).toBe('前端开发');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeTreeName('前端  开发')).toBe('前端 开发');
  });
});

describe('checkDuplicateTreeName', () => {
  const trees: KnowledgeTree[] = [
    { id: 't1', libraryId: 'computer', name: '前端开发', description: '', color: '', ownerType: 'system', pointIds: [], createdAt: '', updatedAt: '' },
    { id: 't2', libraryId: 'computer', name: 'AI工程', description: '', color: '', ownerType: 'system', pointIds: [], createdAt: '', updatedAt: '' },
  ];

  it('returns true for exact duplicate', () => {
    expect(checkDuplicateTreeName('前端开发', trees)).toBe(true);
  });

  it('returns false for unique name', () => {
    expect(checkDuplicateTreeName('后端开发', trees)).toBe(false);
  });

  it('excludes current tree when editing', () => {
    expect(checkDuplicateTreeName('前端开发', trees, 't1')).toBe(false);
  });
});

describe('generateAnonymousTreeName', () => {
  it('generates first anonymous name', () => {
    const trees: KnowledgeTree[] = [];
    expect(generateAnonymousTreeName(trees)).toBe('未命名知识树 01');
  });

  it('skips occupied names', () => {
    const trees: KnowledgeTree[] = [
      { id: 't1', libraryId: 'computer', name: '未命名知识树 01', description: '', color: '', ownerType: 'user', pointIds: [], createdAt: '', updatedAt: '' },
    ];
    expect(generateAnonymousTreeName(trees)).toBe('未命名知识树 02');
  });
});

describe('resolveGoalTreeTarget', () => {
  const tree = (id: string, name: string, pointIds: string[]): KnowledgeTree => ({
    id, libraryId: 'computer', name, description: '', color: '', ownerType: 'user', pointIds, createdAt: '', updatedAt: '',
  });

  it('同名同范围复用已有树，重复整理同一个目标不会失败', () => {
    const existing = [tree('t1', '考研408 · 定向学习', ['a', 'b'])];
    expect(resolveGoalTreeTarget(existing, { name: '考研408 · 定向学习', pointIds: ['b', 'a'] })).toEqual({ reuse: existing[0] });
  });

  it('名字大小写/空格差异仍算同一棵树', () => {
    const existing = [tree('t1', 'AI 工程', ['a'])];
    expect(resolveGoalTreeTarget(existing, { name: '  ai 工程 ', pointIds: ['a'] })).toEqual({ reuse: existing[0] });
  });

  it('同名但范围不同时保留旧树，新树用同前缀的空名', () => {
    const existing = [tree('t1', '前端 · 定向学习', ['a']), tree('t2', '前端 · 定向学习 2', ['a', 'b'])];
    expect(resolveGoalTreeTarget(existing, { name: '前端 · 定向学习', pointIds: ['c'] })).toEqual({ name: '前端 · 定向学习 3' });
  });

  it('没有同名树时沿用原名称', () => {
    expect(resolveGoalTreeTarget([], { name: '全新目标', pointIds: ['a'] })).toEqual({ name: '全新目标' });
  });
});

describe('V9 编辑位置和提交边界', () => {
  let values: Map<string, string>;
  let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
  const pointDraft = (treeId: string, id: string): PointDraft => ({ id, treeId, name: id, kind: 'knowledge', description: '', content: '', color: '#b1d8ca', tags: [], learningObjectives: [], misconceptions: [], recommendedContent: [], childIds: [], prerequisiteIds: [], relatedIds: [], position: [0, 0, 0] });
  const createFixture = () => {
    const { library } = migrateV9();
    const tree = createTree(library.id, { identity: { name: '编辑回归', description: '', color: '#b1d8ca' } });
    const first = createPoint(tree.id, pointDraft(tree.id, 'editable-a'));
    const second = createPoint(tree.id, pointDraft(tree.id, 'editable-b'));
    return { tree, first, second };
  };
  beforeEach(() => {
    values = new Map();
    storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    };
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('拖动之后保存旧内容/关系草稿、增删节点、重新读取都不覆盖坐标', () => {
    const { tree, first, second } = createFixture();
    const draft = hydratePointDraft(tree.id, first.id)!;
    expect(draft.position).toEqual([0, 0, 0]);
    expect(updatePoint(first.id, { position: [7.5, -3.25, 9] })).toEqual({ ok: true });
    draft.name = '内容修改';
    draft.content = '新的教学正文';
    draft.relatedIds = [second.id];
    expect(savePointDraft(tree.id, first.id, draft)).toEqual({ ok: true });
    createPoint(tree.id, pointDraft(tree.id, 'editable-c'));
    expect(deletePoint(tree.id, 'editable-c')).toEqual({ ok: true });
    const restored = hydratePointDraft(tree.id, first.id)!;
    expect(restored.position).toEqual([7.5, -3.25, 9]);
    expect(restored.name).toBe('内容修改');
    expect(restored.relatedIds).toContain(second.id);
    expect(migrateV9().points.find((point) => point.id === first.id)?.position).toEqual([7.5, -3.25, 9]);
  });

  it('写入失败返回失败，原记录与调用方草稿保持，并允许原草稿重试', () => {
    const { tree, first } = createFixture();
    const draft = hydratePointDraft(tree.id, first.id)!;
    draft.content = '未保存正文';
    const original = values.get(V9_STORAGE_KEY);
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(savePointDraft(tree.id, first.id, draft).ok).toBe(false);
    expect(updatePoint(first.id, { position: [4, 5, 6] }).ok).toBe(false);
    expect(values.get(V9_STORAGE_KEY)).toBe(original);
    expect(draft.content).toBe('未保存正文');
    storage.setItem.mockImplementation((key: string, value: string) => values.set(key, value));
    expect(savePointDraft(tree.id, first.id, draft)).toEqual({ ok: true });
    expect(hydratePointDraft(tree.id, first.id)?.content).toBe('未保存正文');
  });

  it('正式提交复用草稿 id，重试不重复节点、成员或关系', () => {
    const { tree, first } = createFixture();
    const draft = { ...pointDraft(tree.id, 'stable-draft'), prerequisiteIds: [first.id], position: [1, 2, 3] as [number, number, number] };
    const restoredDraft = JSON.parse(JSON.stringify(draft)) as PointDraft;
    expect(createPoint(tree.id, restoredDraft).id).toBe(draft.id);
    expect(createPoint(tree.id, restoredDraft).id).toBe(draft.id);
    const state = migrateV9();
    expect(state.points.filter((point) => point.id === draft.id)).toHaveLength(1);
    expect(state.memberships.filter((membership) => membership.pointId === draft.id)).toHaveLength(1);
    expect(state.relations.filter((relation) => relation.targetPointId === draft.id)).toHaveLength(1);
    expect(state.points.find((point) => point.id === draft.id)?.position).toEqual([1, 2, 3]);
  });

  it('失败创建不混入正式树，重试使用同一草稿', () => {
    const { tree } = createFixture();
    const draft = pointDraft(tree.id, 'retry-draft');
    storage.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(() => createPoint(tree.id, draft)).toThrow('未能保存');
    expect(migrateV9().points.some((point) => point.id === draft.id)).toBe(false);
    storage.setItem.mockImplementation((key: string, value: string) => values.set(key, value));
    expect(createPoint(tree.id, draft).id).toBe(draft.id);
  });

  it('手动与自动入口共用创建事务，并为已有节点建立成员关系', () => {
    const { library } = migrateV9();
    const manual = createTree(library.id, { identity: { name: '手动空树', description: '', color: '#b1d8ca' } });
    const generated = createTree(library.id, {
      identity: { name: '目标整理树', description: '来自目标', color: '#b1d8ca' },
      pointIds: ['direction-408', 'course-computer-networks', 'knowledge-tcp', 'knowledge-tcp'],
    });
    const state = migrateV9();

    expect(manual.pointIds).toEqual([]);
    expect(generated.pointIds).toEqual(['direction-408', 'course-computer-networks', 'knowledge-tcp']);
    expect(state.memberships.filter((membership) => membership.treeId === generated.id)).toHaveLength(3);
    expect(state.memberships.find((membership) => membership.treeId === generated.id && membership.pointId === 'direction-408')?.role).toBe('root');
    expect(state.memberships.find((membership) => membership.treeId === generated.id && membership.pointId === 'knowledge-tcp')?.role).toBe('leaf');
  });

  it('拒绝包含不存在知识点的树且不写入半成品', () => {
    const { library } = migrateV9();
    expect(() => createTree(library.id, {
      identity: { name: '无效目标树', description: '', color: '#b1d8ca' },
      pointIds: ['missing-point'],
    })).toThrow('知识树包含不存在的知识点');
    expect(migrateV9().userTrees.some((tree) => tree.name === '无效目标树')).toBe(false);
  });

  it('拒绝循环、自连、被删除目标与非有限坐标，不复活删除节点', () => {
    const { tree, first, second } = createFixture();
    const a = hydratePointDraft(tree.id, first.id)!;
    const b = hydratePointDraft(tree.id, second.id)!;
    b.parentId = first.id;
    expect(savePointDraft(tree.id, second.id, b).ok).toBe(true);
    a.parentId = second.id;
    expect(savePointDraft(tree.id, first.id, a).ok).toBe(false);
    a.parentId = first.id;
    expect(savePointDraft(tree.id, first.id, a).ok).toBe(false);
    expect(updatePoint(first.id, { position: [NaN, 0, 0] }).ok).toBe(false);
    deletePoint(tree.id, first.id);
    expect(savePointDraft(tree.id, first.id, a).ok).toBe(false);
    expect(savePointDraft(tree.id, second.id, b).ok).toBe(false);
    expect(migrateV9().points.some((point) => point.id === first.id)).toBe(false);
  });

  it.each(['{broken', '{"version":10}', '{"version":9,"points":null}'])('损坏/新版本记录不会被下一次编辑覆盖：%s', (raw) => {
    values.set(V9_STORAGE_KEY, raw);
    const state = migrateV9();
    expect(updatePoint(state.points[0].id, { content: '不得写入' }).ok).toBe(false);
    expect(values.get(V9_STORAGE_KEY)).toBe(raw);
  });
});
