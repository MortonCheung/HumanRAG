// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from '../../../app/AppShell';
import { GlobalNav } from '../../../components/navigation/GlobalNav';
import { ROUTES } from '../../../app/routes';
import { createTree, migrateV9 } from '../../../domain/knowledge/migration';
import { KnowledgeTreeWorkspace } from '../KnowledgeTreeWorkspace';
import { TreeStructureEditorPage } from '../../knowledge-tree-editor/pages/TreeStructureEditorPage';
import { TreeEditorShell } from '../../knowledge-tree-editor/TreeEditorShell';
import { PointCreationShell } from '../../knowledge-point-builder/PointCreationShell';
import { PointContentPage } from '../../knowledge-point-builder/pages/PointContentPage';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';

function SelectTcpPoint() {
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  return <button type="button" onClick={() => selectPoint('knowledge-tcp')}>选择 TCP</button>;
}

// Only the GPU canvas is replaced. Real navigation, portals, storage, draft and
// editor components prove that the actual creation route remains reachable.
vi.mock('../../library-builder/components/CustomTreeCanvas', () => ({ CustomTreeCanvas: () => null }));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useSpatialStageStore.setState({ selectedTreePointId: null, hoveredTreePointId: null });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('knowledge tree node creation entry', () => {
  it('keeps Add visible on a narrow user tree and its editor, with the real creation form reachable', async () => {
    const { library } = migrateV9();
    const tree = createTree(library.id, { identity: { name: '导航创建回归', description: '', color: '#b1d8ca' } });
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [
      { path: '/library/:libraryId/tree/:treeId', element: <KnowledgeTreeWorkspace />, children: [{ path: 'path', element: <p>知识点</p> }] },
      { path: '/library/:libraryId/tree/:treeId/edit', element: <TreeEditorShell />, children: [{ path: 'structure', element: <TreeStructureEditorPage /> }] },
      { path: '/library/:libraryId/tree/:treeId/points/new', element: <PointCreationShell />, children: [{ path: 'content', element: <PointContentPage /> }] },
    ] }] }], { initialEntries: [ROUTES.treePath(library.id, tree.id)] });
    render(<RouterProvider router={router} />);
    const assertAdd = () => {
      const add = screen.getByRole('button', { name: '新增节点' });
      expect(add.closest('#context-nav-primary')).not.toBeNull();
      expect(add.closest('[hidden]')).toBeNull();
      return add;
    };
    fireEvent.click(assertAdd());
    await screen.findByLabelText('名称');
    expect(router.state.location.pathname).toBe(ROUTES.pointNewContent(library.id, tree.id));
    fireEvent.click(screen.getByRole('button', { name: '返回节点编辑' }));
    await screen.findByText('暂无知识点');
    expect(router.state.location.pathname).toBe(ROUTES.treeEdit(library.id, tree.id));
    assertAdd();
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull();
    await act(() => router.navigate(ROUTES.treePath(library.id, tree.id)));
    assertAdd();
  });

  it('makes the system example read-only state explicit without adding write controls', () => {
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [
      { path: '/library/:libraryId/tree/:treeId', element: <KnowledgeTreeWorkspace />, children: [{ path: 'path', element: <p>知识点</p> }] },
    ] }] }], { initialEntries: [ROUTES.treePath('computer', 'tree-408')] });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: '页面操作' }));
    expect(screen.getByText('只读').getAttribute('title')).toBeNull();
    expect(screen.queryByRole('button', { name: '新增节点' })).toBeNull();
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull();
  });

  it('offers three equal point intents and uses their canonical routes', async () => {
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [
      { path: '/library/:libraryId/tree/:treeId', element: <KnowledgeTreeWorkspace />, children: [{ path: 'path', element: <SelectTcpPoint /> }] },
      { path: '/library/:libraryId/tree/:treeId/point/:pointId/study', element: <p>自学工作区</p> },
      { path: '/library/:libraryId/tree/:treeId/point/:pointId/teach', element: <p>带我学工作区</p> },
      { path: '/library/:libraryId/tree/:treeId/point/:pointId/verify', element: <p>测验工作区</p> },
    ] }] }], { initialEntries: [ROUTES.treePath('computer', 'tree-408')] });
    render(<RouterProvider router={router} />);
    const actions = [
      ['自学', ROUTES.pointStudy('computer', 'tree-408', 'knowledge-tcp'), '自学工作区'],
      ['带我学', ROUTES.pointTeach('computer', 'tree-408', 'knowledge-tcp'), '带我学工作区'],
      ['刷题', ROUTES.pointVerify('computer', 'tree-408', 'knowledge-tcp'), '测验工作区'],
    ] as const;
    for (const [label, route, destination] of actions) {
      await act(() => router.navigate(ROUTES.treePath('computer', 'tree-408')));
      fireEvent.click(await screen.findByRole('button', { name: '选择 TCP' }));
      expect(screen.getByRole('group', { name: '知识点操作' }).querySelectorAll('button')).toHaveLength(3);
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(router.state.location.pathname).toBe(route);
      await screen.findByText(destination);
    }
  });
});
