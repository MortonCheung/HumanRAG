// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { useUnsavedChanges } from './useUnsavedChanges';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup({ save = vi.fn(() => true), discard = vi.fn(), dirty = true, allowNavigation }: { save?: () => boolean | Promise<boolean>; discard?: () => void; dirty?: boolean; allowNavigation?: (nextPath: string) => boolean } = {}) {
  const selected = vi.fn();
  function Editor() {
    const { guard, confirmAction } = useUnsavedChanges({ dirty, onSave: save, onDiscard: discard, allowNavigation });
    return <>{guard}<Link to="/parent">返回父级</Link><button onClick={() => confirmAction(selected)}>选择其他节点</button></>;
  }
  const router = createMemoryRouter([
    { path: '/edit', element: <Editor /> },
    { path: '/parent', element: <p>父页面</p> },
  ], { initialEntries: ['/parent', '/edit'] });
  render(<RouterProvider router={router} />);
  return { router, selected, save, discard };
}

describe('unsaved changes guard', () => {
  it('keeps the current route on cancel and continues only after a successful save', async () => {
    const { router, save } = setup();
    fireEvent.click(screen.getByRole('link', { name: '返回父级' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
    expect(router.state.location.pathname).toBe('/edit');
    fireEvent.click(screen.getByRole('link', { name: '返回父级' }));
    fireEvent.click(screen.getByRole('button', { name: '保存并离开' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/parent'));
    expect(save).toHaveBeenCalledOnce();
  });

  it('does not navigate on storage failure and still permits explicitly discarding', async () => {
    const { router, discard } = setup({ save: () => false });
    fireEvent.click(screen.getByRole('link', { name: '返回父级' }));
    fireEvent.click(screen.getByRole('button', { name: '保存并离开' }));
    await screen.findByRole('alert');
    expect(router.state.location.pathname).toBe('/edit');
    fireEvent.click(screen.getByRole('button', { name: '放弃修改' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/parent'));
    expect(discard).toHaveBeenCalledOnce();
  });

  it('also protects browser Back and in-page selection, without rewriting history', async () => {
    const { router, selected } = setup();
    await act(() => router.navigate(-1));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '继续编辑' }));
    fireEvent.click(screen.getByRole('button', { name: '选择其他节点' }));
    expect(selected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '保存并离开' }));
    await waitFor(() => expect(selected).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe('/edit');
  });

  it('does not prompt for a clean editor or an allowed same-draft creation step', async () => {
    const { router } = setup({ allowNavigation: (nextPath) => nextPath === '/parent' });
    fireEvent.click(screen.getByRole('link', { name: '返回父级' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/parent'));
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();
    const clean = setup({ dirty: false });
    fireEvent.click(screen.getByRole('button', { name: '选择其他节点' }));
    expect(clean.selected).toHaveBeenCalledOnce();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
