// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ROUTES } from '../../app/routes';
import { createPoint, createTree, hydratePointDraft, migrateV9, V9_STORAGE_KEY } from '../../domain/knowledge/migration';
import type { PointDraft } from '../../domain/knowledge/types';
import { PointCreationShell, createEmptyPointDraft } from './PointCreationShell';
import { PointContentPage } from './pages/PointContentPage';
import { PointPlacementPage } from './pages/PointPlacementPage';

// Navigation hosts and WebGL have their own integration coverage. Keep this
// regression focused on real draft persistence, router blocking and submission.
vi.mock('../workspace/WorkspaceHeader', () => ({
  WorkspaceHeader: ({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) => <header><h1>{title}</h1><button onClick={onBack}>{backLabel}</button></header>,
  WorkspaceActions: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../library-builder/components/CustomTreeCanvas', () => ({
  CustomTreeCanvas: ({ previewNode, onMove }: { previewNode: { id: string; name: string; position: number[] }; onMove: (id: string, position: [number, number, number]) => void }) => <div>
    <output data-testid="draft-preview" data-point-id={previewNode.id}>{previewNode.name} · {previewNode.position.join(',')}</output>
    <button onClick={() => onMove(previewNode.id, [8, -4, 2])}>移动草稿节点</button>
  </div>,
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function fixture(name = '创建流程回归') {
  const { library } = migrateV9();
  const tree = createTree(library.id, { identity: { name, description: '', color: '#b1d8ca' } });
  const anchor = createPoint(tree.id, { ...createEmptyPointDraft(tree.id), name: '基础概念' });
  const storageKey = `iteach.point-draft.v1:${tree.id}`;
  const readDraft = () => JSON.parse(sessionStorage.getItem(storageKey)!) as PointDraft;
  return { library, tree, anchor, storageKey, readDraft };
}

function openFlow(context: ReturnType<typeof fixture>, { place = false, delayExit = false } = {}) {
  const { library, tree } = context;
  let finishExit: () => void = () => undefined;
  const exit = delayExit ? new Promise<null>((resolve) => { finishExit = () => resolve(null); }) : null;
  const router = createMemoryRouter([
    {
      path: '/library/:libraryId/tree/:treeId/points/new',
      element: <PointCreationShell />,
      children: [
        { path: 'content', element: <PointContentPage /> },
        { path: 'place', element: <PointPlacementPage /> },
      ],
    },
    { path: '/library/:libraryId/tree/:treeId/edit/structure', loader: () => exit, element: <p>节点编辑已打开</p> },
  ], { initialEntries: [(place ? ROUTES.pointNewPlace : ROUTES.pointNewContent)(library.id, tree.id)] });
  const view = render(<RouterProvider router={router} />);
  return { router, view, finishExit };
}

async function fillAndPlace(context: ReturnType<typeof fixture>) {
  fireEvent.change(screen.getByLabelText('名称'), { target: { value: '慢启动窗口' } });
  fireEvent.change(screen.getByLabelText('教学正文'), { target: { value: '从窗口变化观察规则。' } });
  fireEvent.click(screen.getByRole('button', { name: '下一步' }));
  await screen.findByRole('heading', { name: '位置与关系' });
  fireEvent.change(screen.getByLabelText('上级节点'), { target: { value: context.anchor.id } });
  fireEvent.click(screen.getByRole('button', { name: '移动草稿节点' }));
}

describe('创建知识点流程', () => {
  it('内容、放置和回退复用同一草稿；创建后等待离场也不会跳回内容或重复创建', async () => {
    const context = fixture();
    const { router, finishExit } = openFlow(context, { delayExit: true });
    await fillAndPlace(context);
    const draft = context.readDraft();
    fireEvent.click(screen.getByRole('button', { name: '上一步' }));
    await screen.findByRole('heading', { name: '新建知识点' });
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('慢启动窗口');
    expect(context.readDraft().id).toBe(draft.id);
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    await screen.findByRole('heading', { name: '位置与关系' });
    const create = screen.getByRole('button', { name: '创建' });
    fireEvent.click(create);
    fireEvent.click(create);
    await waitFor(() => expect(router.state.navigation.location?.pathname).toBe(ROUTES.treeEdit(context.library.id, context.tree.id)));
    expect(screen.getByTestId('draft-preview').getAttribute('data-point-id')).toBe(draft.id);
    expect(sessionStorage.getItem(context.storageKey)).toBeNull();
    expect(migrateV9().points.filter((point) => point.id === draft.id)).toHaveLength(1);
    expect(hydratePointDraft(context.tree.id, draft.id)).toMatchObject({ name: '慢启动窗口', content: '从窗口变化观察规则。', position: [8, -4, 2], parentId: context.anchor.id });
    await act(async () => { finishExit(); });
    await screen.findByText('节点编辑已打开');
    expect(router.state.location.pathname).toBe(ROUTES.treeEdit(context.library.id, context.tree.id));
    expect(router.state.location.state).toEqual({ selectedPointId: draft.id });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('正式存储失败时停留在放置页并保留草稿，恢复存储后可原样重试', async () => {
    const context = fixture();
    const { router } = openFlow(context);
    await fillAndPlace(context);
    const draft = context.readDraft();
    const setItem = Storage.prototype.setItem;
    const failingWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (this === localStorage && key === V9_STORAGE_KEY) throw new Error('quota');
      setItem.call(this, key, value);
    });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));
    expect((await screen.findByRole('alert')).textContent).toContain('未能保存到本机');
    expect(router.state.location.pathname).toBe(ROUTES.pointNewPlace(context.library.id, context.tree.id));
    expect(context.readDraft()).toEqual(draft);
    expect(migrateV9().points.some((point) => point.id === draft.id)).toBe(false);
    failingWrite.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: '创建' }));
    await screen.findByText('节点编辑已打开');
    expect(hydratePointDraft(context.tree.id, draft.id)?.position).toEqual([8, -4, 2]);
  });

  it('刷新放置页恢复稳定 id、正文、关系和坐标', async () => {
    const context = fixture();
    const initial = openFlow(context);
    await fillAndPlace(context);
    const draft = context.readDraft();
    initial.view.unmount();
    initial.router.dispose();
    openFlow(context, { place: true });
    expect(screen.getByTestId('draft-preview').getAttribute('data-point-id')).toBe(draft.id);
    expect(screen.getByTestId('draft-preview').textContent).toContain('慢启动窗口 · 8,-4,2');
    expect((screen.getByLabelText('上级节点') as HTMLSelectElement).value).toBe(context.anchor.id);
    fireEvent.click(screen.getByRole('button', { name: '上一步' }));
    await screen.findByRole('heading', { name: '新建知识点' });
    expect((screen.getByLabelText('教学正文') as HTMLTextAreaElement).value).toBe(draft.content);
  });

  it('同一个创建路由跨树切换时分别恢复各树草稿，并只提交到当前树', async () => {
    const first = fixture('第一棵树');
    const second = fixture('第二棵树');
    const { router } = openFlow(first);
    await fillAndPlace(first);
    const firstDraft = first.readDraft();

    await act(async () => { await router.navigate(ROUTES.pointNewContent(second.library.id, second.tree.id)); });
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '保存并离开' })); });
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.pointNewContent(second.library.id, second.tree.id)));
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('教学正文') as HTMLTextAreaElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '第二棵树的节点' } });
    const secondDraft = second.readDraft();
    expect(secondDraft.treeId).toBe(second.tree.id);
    expect(secondDraft.id).not.toBe(firstDraft.id);
    expect(secondDraft.parentId).toBeUndefined();
    expect(first.readDraft()).toEqual(firstDraft);

    await act(async () => { await router.navigate(ROUTES.pointNewContent(first.library.id, first.tree.id)); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '保存并离开' })); });
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.pointNewContent(first.library.id, first.tree.id)));
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe(firstDraft.name);
    expect((screen.getByLabelText('教学正文') as HTMLTextAreaElement).value).toBe(firstDraft.content);
    expect(first.readDraft()).toEqual(firstDraft);

    await act(async () => { await router.navigate(ROUTES.pointNewPlace(second.library.id, second.tree.id)); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '保存并离开' })); });
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.pointNewPlace(second.library.id, second.tree.id)));
    expect(screen.getByTestId('draft-preview').getAttribute('data-point-id')).toBe(secondDraft.id);
    fireEvent.change(screen.getByLabelText('上级节点'), { target: { value: second.anchor.id } });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));
    await screen.findByText('节点编辑已打开');
    const state = migrateV9();
    expect(state.memberships.filter((membership) => membership.pointId === secondDraft.id).map((membership) => membership.treeId)).toEqual([second.tree.id]);
    expect(state.points.some((point) => point.id === firstDraft.id)).toBe(false);
    expect(first.readDraft()).toEqual(firstDraft);
    expect(sessionStorage.getItem(second.storageKey)).toBeNull();
  });

  it('放弃放置草稿后正常返回节点编辑，不创建节点也不被空草稿校验拉回', async () => {
    const context = fixture();
    const { router, finishExit } = openFlow(context, { delayExit: true });
    await fillAndPlace(context);
    const draft = context.readDraft();
    fireEvent.click(screen.getByRole('button', { name: '返回节点编辑' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '放弃修改' }));
    await waitFor(() => expect(router.state.navigation.location?.pathname).toBe(ROUTES.treeEdit(context.library.id, context.tree.id)));
    expect(sessionStorage.getItem(context.storageKey)).toBeNull();
    expect(migrateV9().points.some((point) => point.id === draft.id)).toBe(false);
    await act(async () => { finishExit(); });
    await screen.findByText('节点编辑已打开');
    expect(router.state.location.pathname).toBe(ROUTES.treeEdit(context.library.id, context.tree.id));
  });
});
