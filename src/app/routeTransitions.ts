import { NavigationType } from 'react-router-dom';
import './route-transitions.css';

export type RouteDirection = -1 | 0 | 1;

function isSpatialRoute(path: string) {
  return path === '/' || path === '/universe' || path === '/library'
    || /^\/library\/[^/]+\/tree\/[^/]+(?:\/(?:path|verify))?\/?$/.test(path);
}

export function isSpatialEntry(from: string, to: string) {
  return isSpatialRoute(from) && isSpatialRoute(to);
}

function routeLayer(path: string) {
  if (path === '/' || path === '/universe') return 0;
  if (/\/points\/new\/place\/?$/.test(path)) return 5;
  if (/\/points\/new\/content\/?$/.test(path)) return 4;
  if (/\/edit\/(structure|content|questions|settings)\/?$/.test(path)) return 3;
  if (/\/point\/[^/]+\/(study|teach|verify|learn|practice)\/?$/.test(path)) return 3;
  if (/^\/(teach|practice)\//.test(path) || /\/practice\/session\/?$/.test(path)) return 3;
  if (/\/tree\/[^/]+(?:\/(path|verify|learn|practice))?\/?$/.test(path) || /\/trees\/new\/?$/.test(path)) return 2;
  if (/^\/library\/[^/]+\/practice\/?$/.test(path)) return 2;
  return 1;
}

/** Real POP direction wins; ordinary PUSH only moves forward when entering a deeper task. */
export function getRouteDirection(from: string, to: string, navigation: { action?: NavigationType; popDirection?: RouteDirection } = {}): RouteDirection {
  if (from === to) return 0;
  if (navigation.action === NavigationType.Pop) return navigation.popDirection ?? 0;
  if (navigation.action === NavigationType.Replace || isSpatialEntry(from, to)) return 0;
  return routeLayer(to) > routeLayer(from) ? 1 : 0;
}
