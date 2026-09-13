// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryRouter } from 'react-router-dom';
import { getRouteDirection, installRouteTransitionDirection, isSpatialEntry } from './routeTransitions';

afterEach(() => { delete document.documentElement.dataset.routeDirection; });

describe('page layers', () => {
  const tree = '/library/computer/tree/my-tree';
  it.each([
    ['/universe', '/library', 0],
    ['/library', tree, 0],
    [tree, `${tree}/path`, 0],
    [`${tree}/path`, `${tree}/verify`, 0],
    [tree, `${tree}/edit/structure`, 1],
    [`${tree}/edit/structure`, `${tree}/edit/questions`, 0],
    [`${tree}/edit/structure`, `${tree}/points/new/content`, 1],
    [`${tree}/points/new/content`, `${tree}/points/new/place`, 1],
    [`${tree}/points/new/place`, `${tree}/points/new/content`, -1],
    [`${tree}/edit/structure`, tree, -1],
    [`${tree}/point/tcp/study`, `${tree}/path`, -1],
    [`${tree}/point/tcp/teach`, `${tree}/path`, -1],
    [`${tree}/point/tcp/verify`, `${tree}/verify`, -1],
    ['/teach/tu-knowledge-tcp', `${tree}/path`, -1],
    ['/teach/tu-knowledge-tcp', '/progress', 1],
    ['/progress', '/teach/tu-knowledge-tcp', -1],
  ])('uses the product layer from %s to %s', (from, to, direction) => {
    expect(getRouteDirection(from, to)).toBe(direction);
  });

  it('leaves the shared opening shot to its camera timeline', () => {
    expect(isSpatialEntry('/', '/universe')).toBe(true);
    expect(isSpatialEntry('/universe', '/')).toBe(true);
    expect(isSpatialEntry('/universe', '/library')).toBe(true);
    expect(isSpatialEntry('/library', `${tree}/path`)).toBe(true);
    expect(getRouteDirection('/', '/universe')).toBe(0);
  });

  it('tracks explicit parent navigation and browser POP without replacing router methods', async () => {
    const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/library'] });
    const navigate = router.navigate;
    const subscribe = router.subscribe;
    const cleanup = installRouteTransitionDirection(router);
    await router.navigate(tree);
    expect(document.documentElement.dataset.routeDirection).toBe('lateral');
    await router.navigate(`${tree}/path`);
    expect(document.documentElement.dataset.routeDirection).toBe('lateral');
    await router.navigate('/library');
    expect(document.documentElement.dataset.routeDirection).toBe('lateral');
    await router.navigate(-1);
    expect(document.documentElement.dataset.routeDirection).toBe('lateral');
    expect(router.navigate).toBe(navigate);
    expect(router.subscribe).toBe(subscribe);
    cleanup();
    router.dispose();
  });
});
