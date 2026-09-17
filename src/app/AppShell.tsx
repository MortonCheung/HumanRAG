import { useEffect } from 'react';
import { NavigationType, Outlet, useLocation } from 'react-router-dom';
import { RouteTransition } from './RouteTransition';
import { useAppHistory } from './appHistory';

export function AppShell() {
  const location = useLocation();
  const history = useAppHistory();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="app-root">
      <RouteTransition routeKey={location.key} direction={history?.direction ?? 0} navigationType={history?.action ?? NavigationType.Pop}>
        <Outlet />
      </RouteTransition>
    </div>
  );
}
