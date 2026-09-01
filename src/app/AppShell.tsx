import { Suspense, lazy, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { GlobalNav } from '../components/navigation/GlobalNav';
import { MobileNav } from '../components/navigation/MobileNav';
import { RouteTransition } from './RouteTransition';
import { useUiStore } from '../store/uiStore';

const GlobalSearch = lazy(() => import('../components/search/GlobalSearch').then((module) => ({ default: module.GlobalSearch })));

export function AppShell() {
  const location = useLocation();
  const openSearch = useUiStore((state) => state.openSearch);

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

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="app-root">
      <GlobalNav />
      <Suspense fallback={null}>
        <GlobalSearch />
      </Suspense>
      <MobileNav />
      <AnimatePresence mode="wait" initial={false}>
        <RouteTransition key={location.pathname.split('/').slice(0, 2).join('/')} routeKey={location.pathname.split('/').slice(0, 2).join('/')}>
          <Outlet />
        </RouteTransition>
      </AnimatePresence>
    </div>
  );
}
