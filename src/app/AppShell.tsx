import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalNav } from '../components/navigation/GlobalNav';
import { RouteTransition } from './RouteTransition';
import { getRouteDirection } from './routeTransitions';

export function AppShell() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const direction = getRouteDirection(previousPath.current, location.pathname);

  useEffect(() => {
    previousPath.current = location.pathname;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="app-root">
      <GlobalNav />
      <RouteTransition routeKey={location.pathname} direction={direction}>
        <Outlet />
      </RouteTransition>
    </div>
  );
}
