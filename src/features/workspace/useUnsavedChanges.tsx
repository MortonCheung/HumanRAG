import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlocker, type BlockerFunction } from 'react-router-dom';

interface UnsavedChangesOptions {
  dirty: boolean;
  onSave: () => boolean | Promise<boolean>;
  onDiscard: () => void;
  /** Creation steps share one draft, so navigating between them is not leaving. */
  allowNavigation?: (nextPath: string) => boolean;
}

/** Native router blocking also covers browser Back; no history rewriting. */
export function useUnsavedChanges({ dirty, onSave, onDiscard, allowNavigation }: UnsavedChangesOptions) {
  const latest = useRef({ dirty, onSave, onDiscard, allowNavigation });
  latest.current = { dirty, onSave, onDiscard, allowNavigation };
  const blocker = useBlocker(useCallback<BlockerFunction>(({ nextLocation }) => latest.current.dirty && !latest.current.allowNavigation?.(nextLocation.pathname), []));
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const active = blocker.state === 'blocked' || pendingAction !== null;

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      if (!latest.current.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeClose);
    return () => window.removeEventListener('beforeunload', warnBeforeClose);
  }, [dirty]);

  useEffect(() => {
    if (!active || !dialog.current) return;
    const previousFocus = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [active]);

  const cancel = () => {
    if (saving.current) return;
    if (blocker.state === 'blocked') blocker.reset();
    setPendingAction(null);
    setError('');
  };
  const proceed = () => {
    const action = pendingAction;
    setPendingAction(null);
    setError('');
    if (blocker.state === 'blocked') blocker.proceed();
    else action?.();
  };
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (await latest.current.onSave()) proceed();
      else setError('未能保存，修改仍保留在当前页面。');
    } catch {
      setError('未能保存，修改仍保留在当前页面。');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const discard = () => {
    if (saving.current) return;
    try {
      latest.current.onDiscard();
      proceed();
    } catch {
      setError('未能放弃修改，请继续编辑后重试。');
    }
  };
  const confirmAction = (action: () => void) => {
    if (saving.current) return;
    if (!latest.current.dirty) action();
    else {
      setError('');
      setPendingAction(() => action);
    }
  };

  return {
    confirmAction,
    guard: active ? createPortal(
      <dialog ref={dialog} className="context-nav__guard" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); cancel(); }}>
        <h2 id={titleId}>有尚未保存的修改</h2>
        <p id={descriptionId}>保存后离开，或放弃本次修改。</p>
        {error && <p role="alert">{error}</p>}
        <div className="context-nav__guard-actions">
          <button type="button" className="context-nav__button" onClick={cancel} disabled={busy} autoFocus>继续编辑</button>
          <button type="button" className="context-nav__button" onClick={discard} disabled={busy}>放弃修改</button>
          <button type="button" className="context-nav__button context-nav__button--primary" onClick={save} disabled={busy}>{busy ? '正在保存…' : '保存并离开'}</button>
        </div>
      </dialog>, document.body,
    ) : null,
  };
}
