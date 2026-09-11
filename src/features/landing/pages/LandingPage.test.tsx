// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpatialExperienceContext } from '../../spatial/SpatialExperienceContext';
import type { SpatialExperiencePhase } from '../../spatial/SpatialExperienceContext';
import { LandingPage } from './LandingPage';

afterEach(cleanup);

describe('entry overlay lifecycle', () => {
  it('keeps the landing dismissed and the captured welcome stable after entry', () => {
    const page = (phase: SpatialExperiencePhase) => <SpatialExperienceContext.Provider value={{ phase, model: { nodes: [], edges: [] } as never, beginUniverseEntry: vi.fn(), ready: true, pendingEntry: false }}><LandingPage /></SpatialExperienceContext.Provider>;
    const view = render(page('landing'));
    const title = view.container.querySelector('h1')?.textContent;
    expect(view.container.querySelector('main')?.hasAttribute('inert')).toBe(false);
    view.rerender(page('entering'));
    expect(view.container.querySelector('main')?.classList.contains('is-entering')).toBe(true);
    expect(view.container.querySelector('h1')?.textContent).toBe(title);
    view.rerender(page('universe'));
    expect(view.container.querySelector('main')?.hidden).toBe(true);
    expect(view.container.querySelector('main')?.hasAttribute('inert')).toBe(true);
    expect(view.container.querySelector('main')?.classList.contains('is-entering')).toBe(true);
  });
});
