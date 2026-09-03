import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalNav } from '../components/navigation/GlobalNav';
import { MobileNav } from '../components/navigation/MobileNav';
import { RouteTransition } from './RouteTransition';

export function AppShell() {
  const location = useLocation();
  const routeDepth = location.pathname.split('/').filter(Boolean).length;
  const previousDepth = useRef(routeDepth);
  const direction = routeDepth > previousDepth.current ? 1 : routeDepth < previousDepth.current ? -1 : 0;

  useEffect(() => {
    previousDepth.current = routeDepth;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, routeDepth]);

  return (
    <div className="app-root">
      <GlobalNav />
      <MobileNav />
      <RouteTransition key={location.pathname} routeKey={location.pathname} direction={direction}>
        <Outlet />
      </RouteTransition>
    </div>
  );
}
