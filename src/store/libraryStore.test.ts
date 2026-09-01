import { beforeEach, describe, expect, it } from 'vitest';
import { useLibraryStore, type CustomNode } from './libraryStore';

const node: CustomNode = {
  id: 'cnode-test',
  name: '测试节点',
  kind: 'knowledge',
  description: '用于验证知识库状态。',
  x: 0,
  y: 0,
};

describe('libraryStore', () => {
  beforeEach(() => useLibraryStore.getState().resetAll());

  it('同名知识库使用不同 id，不覆盖已发布内容', () => {
    const store = useLibraryStore.getState();
    store.createDraft('操作系统');
    useLibraryStore.getState().addNode(node);
    const firstId = useLibraryStore.getState().publishDraft();

    useLibraryStore.getState().resetDraft();
    useLibraryStore.getState().createDraft('操作系统');
    useLibraryStore.getState().addNode({ ...node, id: 'cnode-test-2' });
    const secondId = useLibraryStore.getState().publishDraft();

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
    expect(useLibraryStore.getState().userLibraries).toHaveLength(2);
  });

  it('草稿能从已发布知识库重新载入', () => {
    useLibraryStore.getState().createDraft('数据库');
    useLibraryStore.getState().addNode(node);
    const id = useLibraryStore.getState().publishDraft();
    expect(id).toBeTruthy();
    useLibraryStore.getState().resetDraft();
    useLibraryStore.getState().loadDraftFromLibrary(id!);
    expect(useLibraryStore.getState().draft?.status).toBe('draft');
    expect(useLibraryStore.getState().draft?.nodes[0]?.name).toBe('测试节点');
  });

  it('节点与关系一次性提交，并只在拖动结束时保存三维坐标', () => {
    useLibraryStore.getState().createDraft('三维知识树');
    useLibraryStore.getState().addNode({ ...node, id: 'root', kind: 'course', position: [0, 8, 0] });
    useLibraryStore.getState().commitNodeBundle(
      { ...node, id: 'child', position: [4, 2, 3], x: 4, y: 2, z: 3 },
      [{ id: 'edge-root-child', source: 'root', target: 'child', relationType: 'hierarchy' }],
    );
    expect(useLibraryStore.getState().draft?.nodes).toHaveLength(2);
    expect(useLibraryStore.getState().draft?.edges).toHaveLength(1);

    useLibraryStore.getState().commitNodePosition('child', [5.5, 1.25, -2]);
    const child = useLibraryStore.getState().draft?.nodes.find((entry) => entry.id === 'child');
    expect(child?.position).toEqual([5.5, 1.25, -2]);
    expect([child?.x, child?.y, child?.z]).toEqual([5.5, 1.25, -2]);
  });
});
