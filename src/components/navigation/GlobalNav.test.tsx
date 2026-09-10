// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '../../app/AppShell';
import { LibraryHomePage } from '../../features/library/pages/LibraryHomePage';
import { WorkspaceHeader } from '../../features/workspace/WorkspaceHeader';
import { TopBar } from '../TopBar';

vi.mock('../../features/library/components/SelectedTreeShowcase', () => ({ SelectedTreeShowcase: () => null }));
vi.mock('../../domain/knowledge/migration', () => ({ migrateV9: () => ({ library: { id: 'computer', name: '计算机科学', treeIds: ['tree-test'] }, trees: [{ id: 'tree-test', name: '测试方向', pointIds: [], ownerType: 'system' }], userTrees: [], points: [], relations: [] }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('flat, persistent page actions', () => {
  it('never lets mobile disclosure state hide desktop actions after clicks, resizes or route returns', async () => {
    let wide = true;
    const listeners = new Set<() => void>();
    const action = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return wide; }, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) })));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = createMemoryRouter([{ element: <AppShell />, children: [
      { path: '/library', element: <WorkspaceHeader title="知识库" actions={<button onClick={action}>当前操作</button>} /> },
      { path: '/progress', element: <WorkspaceHeader title="学习记录" /> },
    ] }], { initialEntries: ['/library'] });
    render(<RouterProvider router={router} />);
    const resize = async (next: boolean) => act(() => { wide = next; listeners.forEach((listener) => listener()); });
    const assertVisible = () => {
      const button = screen.getByRole('button', { name: '当前操作' });
      expect(button.closest('[hidden]')).toBeNull();
      expect(button.closest('details')).toBeNull();
    };
    screen.getByRole('button', { name: '当前操作' }).focus();
    await resize(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '页面操作' }));
    await resize(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '当前操作' }));
    for (let cycle = 0; cycle < 3; cycle += 1) {
      fireEvent.click(screen.getByRole('button', { name: '当前操作' }));
      assertVisible();
      await resize(false);
      expect(screen.queryByRole('button', { name: '当前操作' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: '页面操作' }));
      assertVisible();
      fireEvent.click(screen.getByRole('button', { name: '当前操作' }));
      expect(screen.queryByRole('button', { name: '当前操作' })).toBeNull();
      await resize(true);
      assertVisible();
      await act(() => router.navigate('/progress'));
      await act(() => router.navigate('/library'));
      assertVisible();
    }
    expect(action).toHaveBeenCalledTimes(6);
  });

  it('closes mobile menus with Escape and restores focus to their own trigger', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = createMemoryRouter([{ element: <AppShell />, children: [
      { path: '/library', element: <WorkspaceHeader actions={<button>当前操作</button>} /> },
    ] }], { initialEntries: ['/library'] });
    render(<RouterProvider router={router} />);
    const trigger = screen.getByRole('button', { name: '页面操作' });
    fireEvent.click(trigger);
    screen.getByRole('button', { name: '当前操作' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: '当前操作' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(screen.getByRole('button', { name: '切换页面' }));
    screen.getByRole('link', { name: '知识空间' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '切换页面' }));
  });

  it('keeps Create outside the collapsed menu through viewport and route changes', async () => {
    let wide = true;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ get matches() { return wide; }, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) })));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = createMemoryRouter([{ element: <AppShell />, children: [
      { path: '/library', element: <LibraryHomePage /> },
      { path: '/universe', element: <TopBar /> },
      { path: '/library/computer/trees/new', element: <WorkspaceHeader title="新建知识树" /> },
    ] }], { initialEntries: ['/library'] });
    render(<RouterProvider router={router} />);
    const assertCreate = () => expect(screen.getByRole('button', { name: '创建知识树' }).closest('details')).toBeNull();
    assertCreate();
    await act(() => { wide = false; listeners.forEach((listener) => listener()); });
    assertCreate();
    await act(() => router.navigate('/universe'));
    expect(screen.queryByRole('button', { name: '创建知识树' })).toBeNull();
    fireEvent.click(screen.getByLabelText('页面操作'));
    expect(document.querySelector('.context-nav__actions-slot details')).toBeNull();
    await act(() => router.navigate('/library'));
    assertCreate();
    await act(() => { wide = true; listeners.forEach((listener) => listener()); });
    assertCreate();
    fireEvent.click(screen.getByRole('button', { name: '创建知识树' }));
    await act(async () => {});
    expect(router.state.location.pathname).toBe('/library/computer/trees/new');
  });
});
