import type { createBrowserRouter } from 'react-router-dom';
import './route-transitions.css';

export type RouteDirection = -1 | 0 | 1;

export function isSpatialEntry(from: string, to: string) {
  return (from === '/' && to === '/universe') || (from === '/universe' && to === '/');
}

function routeLayer(path: string) {
  if (path === '/' || path === '/universe') return 0;
  if (/\/points\/new\/place\/?$/.test(path)) return 5;
  if (/\/points\/new\/content\/?$/.test(path)) return 4;
  if (/\/edit\/(structure|content|questions|settings)\/?$/.test(path)) return 3;
  if (/\/point\/[^/]+\/(learn|practice)\/?$/.test(path)) return 3;
  if (/^\/(teach|practice)\//.test(path) || /\/practice\/session\/?$/.test(path)) return 3;
  if (/\/tree\/[^/]+(?:\/(path|verify|learn|practice))?\/?$/.test(path) || /\/trees\/new\/?$/.test(path)) return 2;
  if (/^\/library\/[^/]+\/practice\/?$/.test(path)) return 2;
  return 1;
}

/** Product hierarchy determines Back, not URL segment count or PUSH versus POP. */
export function getRouteDirection(from: string, to: string): RouteDirection {
  if (from === to || isSpatialEntry(from, to)) return 0;
  if (to === '/progress') return 1;
  if (from === '/progress') return -1;
  return Math.sign(routeLayer(to) - routeLayer(from)) as RouteDirection;
}

/** Read-only subscription: the router still owns snapshots, interruption and POP. */
export function installRouteTransitionDirection(router: ReturnType<typeof createBrowserRouter>) {
  let previousPath = router.state.location.pathname;
  return router.subscribe((state) => {
    const nextPath = state.location.pathname;
    if (nextPath === previousPath) return;
    const direction = getRouteDirection(previousPath, nextPath);
    document.documentElement.dataset.routeDirection = direction > 0 ? 'forward' : direction < 0 ? 'back' : 'lateral';
    previousPath = nextPath;
  });
}
