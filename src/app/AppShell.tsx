import { Suspense, lazy, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalNav } from '../components/navigation/GlobalNav';
import { MobileNav } from '../components/navigation/MobileNav';
import { RouteTransition } from './RouteTransition';
import { useUiStore } from '../store/uiStore';

const GlobalSearch = lazy(() => import('../components/search/GlobalSearch').then((module) => ({ default: module.GlobalSearch })));

export function AppShell() {
  const location = useLocation();
  const openSearch = useUiStore((state) => state.openSearch);
  const routeDepth = location.pathname.split('/').filter(Boolean).length;
  const previousDepth = useRef(routeDepth);
  const direction = routeDepth > previousDepth.current ? 1 : routeDepth < previousDepth.current ? -1 : 0;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      if (!isTyping && ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openSearch]);

  useEffect(() => {
    previousDepth.current = routeDepth;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, routeDepth]);

  return (
    <div className="app-root">
      <GlobalNav />
      <Suspense fallback={null}>
        <GlobalSearch />
      </Suspense>
      <MobileNav />
      <RouteTransition key={location.pathname} routeKey={location.pathname} direction={direction}>
        <Outlet />
      </RouteTransition>
    </div>
  );
}
