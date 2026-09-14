// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '../../app/AppShell';
import { LibraryHomePage } from '../../features/library/pages/LibraryHomePage';
import { WorkspaceHeader } from '../../features/workspace/WorkspaceHeader';
import { TopBar } from '../TopBar';

vi.mock('../../domain/knowledge/migration', () => ({ migrateV9: () => ({ library: { id: 'computer', name: '计算机科学', treeIds: ['tree-test'] }, trees: [{ id: 'tree-test', name: '测试方向', pointIds: [], ownerType: 'system' }], userTrees: [], points: [], relations: [] }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('flat, persistent page actions', () => {
  it('keeps secondary actions behind one disclosure at every width and never strands focus', async () => {
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
    const disclosure = () => screen.getByRole('button', { name: '页面操作' });
    const actionButton = () => screen.getByRole('button', { name: '当前操作', hidden: true });
    const collapsed = () => actionButton().closest('[hidden]') !== null;

    // Desktop starts collapsed exactly like mobile: one disclosure owns the actions.
    expect(collapsed()).toBe(true);
    expect(actionButton().closest('details')).toBeNull();

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await resize(cycle % 2 === 1);
      expect(collapsed()).toBe(true);
      fireEvent.click(disclosure());
      expect(collapsed()).toBe(false);
      fireEvent.click(actionButton());
      expect(collapsed()).toBe(true);
      await act(() => router.navigate('/progress'));
      await act(() => router.navigate('/library'));
      expect(collapsed()).toBe(true);
    }
    expect(action).toHaveBeenCalledTimes(3);

    // Resizing while focus sits inside the open panel must move focus to the trigger.
    fireEvent.click(disclosure());
    actionButton().focus();
    await resize(true);
    expect(collapsed()).toBe(true);
    expect(document.activeElement).toBe(disclosure());
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

  it('keeps the current tree entry primary while secondary actions use the mobile menu', async () => {
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
    const assertEntry = () => expect(screen.getByRole('button', { name: '进入知识树' }).closest('.context-nav__primary-slot')).not.toBeNull();
    assertEntry();
    await act(() => { wide = false; listeners.forEach((listener) => listener()); });
    assertEntry();
    expect(screen.queryByRole('button', { name: '创建知识树' })).toBeNull();
    fireEvent.click(screen.getByLabelText('页面操作'));
    expect(screen.getByRole('button', { name: '创建知识树' })).not.toBeNull();
    await act(() => router.navigate('/universe'));
    expect(screen.queryByRole('button', { name: '创建知识树' })).toBeNull();
    fireEvent.click(screen.getByLabelText('页面操作'));
    expect(document.querySelector('.context-nav__actions-slot details')).toBeNull();
    await act(() => router.navigate('/library'));
    assertEntry();
    await act(() => { wide = true; listeners.forEach((listener) => listener()); });
    assertEntry();
    fireEvent.click(screen.getByLabelText('页面操作'));
    fireEvent.click(screen.getByRole('button', { name: '创建知识树' }));
    await act(async () => {});
    expect(router.state.location.pathname).toBe('/library/computer/trees/new');
  });
});
