// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from '../../app/AppShell';
import { LibraryHomePage } from '../../features/library/pages/LibraryHomePage';
import { WorkspaceHeader } from '../../features/workspace/WorkspaceHeader';
import { TopBar } from '../TopBar';
import { GlobalNav } from './GlobalNav';

vi.mock('../../domain/knowledge/migration', () => ({ migrateV9: () => ({ library: { id: 'computer', name: '计算机科学', treeIds: ['tree-test'] }, trees: [{ id: 'tree-test', name: '测试方向', pointIds: [], ownerType: 'system' }], userTrees: [], points: [], relations: [] }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('flat, persistent page actions', () => {
  it('shows secondary actions inline at 1100px and moves them into overflow below it', async () => {
    let width = 1440;
    const listeners = new Set<() => void>();
    const action = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ get matches() { return width >= Number(query.match(/min-width:\s*(\d+)px/)?.[1] ?? 0); }, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) })));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [
      { path: '/library', element: <WorkspaceHeader title="知识库" actions={<button onClick={action}>当前操作</button>} /> },
      { path: '/progress', element: <WorkspaceHeader title="我的学习" /> },
    ] }] }], { initialEntries: ['/library'] });
    render(<RouterProvider router={router} />);
    const resize = async (next: number) => act(() => { width = next; listeners.forEach((listener) => listener()); });
    const disclosure = () => screen.getByRole('button', { name: '页面操作' });
    const actionButton = () => screen.getByRole('button', { name: '当前操作', hidden: true });
    const collapsed = () => actionButton().closest('[hidden]') !== null;

    expect(collapsed()).toBe(false);
    fireEvent.click(actionButton());
    expect(action).toHaveBeenCalledOnce();

    await resize(1024);
    expect(collapsed()).toBe(true);
    expect(actionButton().closest('details')).toBeNull();
    fireEvent.click(disclosure());
    expect(collapsed()).toBe(false);
    actionButton().focus();
    await act(() => router.navigate('/progress'));
    await act(() => router.navigate('/library'));
    expect(collapsed()).toBe(true);
  });

  it('closes mobile menus with Escape and restores focus to their own trigger', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [
      { path: '/library', element: <WorkspaceHeader actions={<button>当前操作</button>} /> },
    ] }] }], { initialEntries: ['/library'] });
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
    let width = 1440;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ get matches() { return width >= Number(query.match(/min-width:\s*(\d+)px/)?.[1] ?? 0); }, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) })));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [
      { path: '/library', element: <LibraryHomePage /> },
      { path: '/universe', element: <TopBar /> },
      { path: '/library/computer/trees/new', element: <WorkspaceHeader title="新建知识树" /> },
    ] }] }], { initialEntries: ['/library'] });
    render(<RouterProvider router={router} />);
    const assertEntry = () => expect(screen.getByRole('button', { name: '进入知识树' }).closest('.context-nav__primary-slot')).not.toBeNull();
    assertEntry();
    await act(() => { width = 390; listeners.forEach((listener) => listener()); });
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
    await act(() => { width = 1440; listeners.forEach((listener) => listener()); });
    assertEntry();
    fireEvent.click(screen.getByRole('button', { name: '创建知识树' }));
    await act(async () => {});
    expect(router.state.location.pathname).toBe('/library/computer/trees/new');
  });
});
