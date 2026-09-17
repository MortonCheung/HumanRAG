import { NavigationType } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { getRouteDirection, isSpatialEntry } from './routeTransitions';

describe('route transition direction', () => {
  const tree = '/library/computer/tree/my-tree';

  it.each([
    ['/universe', '/library', 0],
    ['/library', tree, 0],
    [tree, `${tree}/path`, 0],
    [tree, `${tree}/edit/structure`, 1],
    [`${tree}/edit/structure`, `${tree}/edit/questions`, 0],
    [`${tree}/edit/structure`, `${tree}/points/new/content`, 1],
    [`${tree}/points/new/content`, `${tree}/points/new/place`, 1],
    [`${tree}/points/new/place`, `${tree}/points/new/content`, 0],
    [`${tree}/edit/structure`, tree, 0],
    [`${tree}/point/tcp/study`, `${tree}/path`, 0],
    ['/teach/tu-knowledge-tcp', '/progress', 0],
    ['/progress', '/teach/tu-knowledge-tcp', 1],
  ])('uses hierarchy only for ordinary PUSH from %s to %s', (from, to, direction) => {
    expect(getRouteDirection(from, to, { action: NavigationType.Push })).toBe(direction);
  });

  it('uses the observed index change for POP back and forward', () => {
    expect(getRouteDirection('/progress', '/library', { action: NavigationType.Pop, popDirection: -1 })).toBe(-1);
    expect(getRouteDirection('/library', '/progress', { action: NavigationType.Pop, popDirection: 1 })).toBe(1);
  });

  it('treats REPLACE as lateral', () => {
    expect(getRouteDirection(`${tree}/point/tcp/study`, `${tree}/path`, { action: NavigationType.Replace })).toBe(0);
  });

  it('leaves the shared spatial shot to its camera timeline', () => {
    expect(isSpatialEntry('/', '/universe')).toBe(true);
    expect(isSpatialEntry('/universe', '/')).toBe(true);
    expect(isSpatialEntry('/universe', '/library')).toBe(true);
    expect(isSpatialEntry('/library', `${tree}/path`)).toBe(true);
    expect(getRouteDirection('/', '/universe', { action: NavigationType.Push })).toBe(0);
  });
});
