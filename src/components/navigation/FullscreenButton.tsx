import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornersIn, CornersOut } from '@phosphor-icons/react';

export function FullscreenButton() {
  const [active, setActive] = useState(Boolean(document.fullscreenElement));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof document.documentElement.requestFullscreen === 'function';

  useEffect(() => {
    const update = () => { setActive(Boolean(document.fullscreenElement)); setError(''); };
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const toggle = async () => {
    if (busy || !supported) return;
    setBusy(true);
    setError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError(document.fullscreenElement ? '未能退出全屏' : '未能进入全屏');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="context-nav__button" onClick={toggle} disabled={busy || !supported} aria-label={supported ? active ? '退出全屏' : '全屏' : '此浏览器不支持全屏'} aria-pressed={active}>
        {active ? <CornersIn size={18} aria-hidden="true" /> : <CornersOut size={18} aria-hidden="true" />}
        <span>{supported ? active ? '退出全屏' : '全屏' : '全屏不可用'}</span>
      </button>
      {error && createPortal(<div className="context-nav__notice" role="status"><span>{error}</span><button type="button" aria-label="关闭全屏提示" onClick={() => setError('')}>关闭</button></div>, document.body)}
    </>
  );
}
