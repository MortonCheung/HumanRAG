import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TransitionNavLink as NavLink } from '../../app/pageNavigation';
import { CaretDown, DotsThree } from '@phosphor-icons/react';
import { ROUTES } from '../../app/routes';
import { createNavigationHostRef } from './navigationSlots';
import './context-navigation.css';

/** One persistent host. Pages portal their own stateful controls into these slots. */
export function GlobalNav() {
  const { pathname } = useLocation();
  const appMenu = useRef<HTMLDivElement>(null);
  const actionMenu = useRef<HTMLDivElement>(null);
  const hosts = useMemo(() => ({
    back: createNavigationHostRef('back'),
    title: createNavigationHostRef('title'),
    primary: createNavigationHostRef('primary'),
    actions: createNavigationHostRef('actions'),
  }), []);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [appOpen, setAppOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => { setWide(query.matches); setAppOpen(false); setActionsOpen(false); };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setAppOpen(false);
    setActionsOpen(false);
  }, [pathname, wide]);

  useLayoutEffect(() => {
    // Resizing must not strand keyboard focus inside a now-hidden disclosure,
    // or on a mobile trigger that disappears at the desktop breakpoint.
    const focused = document.activeElement;
    for (const menu of [appMenu.current, actionMenu.current]) {
      if (!menu || !focused || !menu.contains(focused)) continue;
      const trigger = menu.querySelector('button');
      const panel = menu.querySelector<HTMLElement>('nav, .context-nav__actions-slot');
      if (!wide && panel?.contains(focused)) trigger?.focus();
      if (wide && focused === trigger) {
        (panel?.querySelector<HTMLElement>('a[href], button:not(:disabled), input, select')
          ?? appMenu.current?.querySelector<HTMLElement>('a[href]'))?.focus();
      }
    }
  }, [wide]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (appMenu.current && !appMenu.current.contains(target)) setAppOpen(false);
      if (actionMenu.current && !actionMenu.current.contains(target)) setActionsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const menu = !wide && (appOpen ? appMenu.current : actionsOpen ? actionMenu.current : null);
      if (!menu) return;
      event.preventDefault();
      event.stopPropagation();
      setAppOpen(false);
      setActionsOpen(false);
      menu.querySelector('button')?.focus();
    };
    // Native bubbling includes portal controls, whose React parent is the page.
    const closeAfterAction = (event: Event) => {
      if ((event.target as Element).closest('button:not(:disabled), a[href]')) {
        const focused = document.activeElement;
        const shouldRestoreFocus = !wide && focused instanceof HTMLElement && Boolean(actionMenu.current?.contains(focused));
        setActionsOpen(false);
        // Dialogs and search panels will claim focus in their own mount effect.
        if (shouldRestoreFocus) actionMenu.current?.querySelector('button')?.focus();
      }
    };
    const actions = actionMenu.current?.querySelector('.context-nav__actions-slot');
    actions?.addEventListener('click', closeAfterAction);
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape, true);
    return () => {
      actions?.removeEventListener('click', closeAfterAction);
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [wide, appOpen, actionsOpen]);

  const fallbackTitle = pathname === ROUTES.library ? '计算机科学' : pathname === ROUTES.progress ? '学习记录' : pathname === ROUTES.universe ? '知识空间' : '';

  return (
    <header className="context-nav" aria-label="页面导航">
      <div className="context-nav__leading">
        <NavLink to={ROUTES.universe} className="context-nav__desktop-brand" aria-label="HumanRAG 知识空间">HumanRAG</NavLink>
        <div className="context-nav__app" ref={appMenu}>
          <button type="button" aria-label="切换页面" className="context-nav__brand" aria-controls="context-nav-app-menu" aria-expanded={appOpen} onClick={() => { setAppOpen((open) => !open); setActionsOpen(false); }}>
            <span className="context-nav__monogram" aria-hidden="true">H</span>
            <span className="context-nav__brand-name">HumanRAG</span>
            <CaretDown size={12} aria-hidden="true" />
          </button>
          <nav id="context-nav-app-menu" className="context-nav__app-menu" aria-label="应用切换" hidden={!wide && !appOpen}>
            <NavLink to={ROUTES.universe} onClick={() => setAppOpen(false)}>知识空间</NavLink>
            <NavLink to={ROUTES.library} onClick={() => setAppOpen(false)}>知识库</NavLink>
          </nav>
        </div>
        <div ref={hosts.back} id="context-nav-back" className="context-nav__back-slot" />
      </div>
      <div className="context-nav__center">
        <div ref={hosts.title} id="context-nav-title" className="context-nav__title-slot" />
        <span className="context-nav__fallback">{fallbackTitle}</span>
      </div>
      <div className="context-nav__trailing">
        <div
          ref={actionMenu}
          className="context-nav__overflow"
        >
          <button type="button" className="context-nav__button context-nav__more" aria-label="页面操作" aria-controls="context-nav-actions" aria-expanded={actionsOpen} onClick={() => { setActionsOpen((open) => !open); setAppOpen(false); }}><DotsThree size={24} aria-hidden="true" /></button>
          <div ref={hosts.actions} id="context-nav-actions" className="context-nav__actions-slot" aria-label="当前页面操作" hidden={!wide && !actionsOpen} />
        </div>
        <div ref={hosts.primary} id="context-nav-primary" className="context-nav__primary-slot" />
      </div>
    </header>
  );
}
