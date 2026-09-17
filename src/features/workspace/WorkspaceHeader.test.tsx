// @vitest-environment jsdom
import { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, MemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { GlobalNav } from '../../components/navigation/GlobalNav';
import { AppShell } from '../../app/AppShell';
import { WorkspaceActions, WorkspaceHeader } from './WorkspaceHeader';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('context navigation host lifecycle', () => {
  it('publishes the current actions and Back when the host mounts after its page', () => {
    const back = vi.fn();
    const action = vi.fn();
    function Page({ host, version }: { host: boolean; version: number }) {
      return <MemoryRouter><WorkspaceHeader title={`节点 ${version}`} onBack={back} actions={<button onClick={() => action(version)}>保存 {version}</button>} />{host && <GlobalNav />}</MemoryRouter>;
    }
    const view = render(<Page host={false} version={1} />);
    expect(screen.queryByRole('button', { name: '返回' })).toBeNull();
    view.rerender(<Page host version={2} />);
    fireEvent.click(screen.getByRole('button', { name: '页面操作' }));
    fireEvent.click(screen.getByRole('button', { name: '保存 2' }));
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(action).toHaveBeenCalledWith(2);
    expect(back).toHaveBeenCalledOnce();
    expect(screen.getByText('节点 2')).toBeTruthy();
  });

  it('reattaches existing page controls when the header is replaced', () => {
    const action = vi.fn();
    function Page({ version }: { version: number }) {
      return <MemoryRouter><GlobalNav key={version} /><WorkspaceHeader title="编辑节点" onBack={() => {}} /><WorkspaceActions><button onClick={() => action(version)}>当前操作 {version}</button></WorkspaceActions></MemoryRouter>;
    }
    const view = render(<Page version={1} />);
    const oldHeader = screen.getByRole('banner');
    view.rerender(<Page version={2} />);
    expect(screen.getByRole('banner')).not.toBe(oldHeader);
    expect(screen.queryByRole('button', { name: '当前操作 1' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '返回' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '页面操作' }));
    fireEvent.click(screen.getByRole('button', { name: '当前操作 2' }));
    expect(action).toHaveBeenCalledWith(2);
  });

  it('keeps a nested draft shell mounted across steps and replaces only child actions', async () => {
    const mounts = vi.fn();
    function DraftShell() {
      const [title, setTitle] = useState('');
      useEffect(() => { mounts(); }, []);
      return <><WorkspaceHeader title="创建节点" onBack={() => {}} /><input aria-label="节点名称" value={title} onChange={(event) => setTitle(event.target.value)} /><Outlet /></>;
    }
    const router = createMemoryRouter([{ element: <><GlobalNav /><Outlet /></>, children: [{ element: <AppShell />, children: [{ element: <DraftShell />, children: [
      { path: '/new/content', element: <WorkspaceActions primary><button>下一步</button></WorkspaceActions> },
      { path: '/new/place', element: <WorkspaceActions primary><button>创建</button></WorkspaceActions> },
    ] }] }] }], { initialEntries: ['/new/content'] });
    render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByRole('textbox', { name: '节点名称' }), { target: { value: '拥塞窗口' } });
    await act(() => router.navigate('/new/place'));
    await waitFor(() => expect(screen.getByRole('button', { name: '创建' })).toBeTruthy());
    expect((screen.getByRole('textbox', { name: '节点名称' }) as HTMLInputElement).value).toBe('拥塞窗口');
    expect(mounts).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: '下一步' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '返回' })).toHaveLength(1);
  });
});
