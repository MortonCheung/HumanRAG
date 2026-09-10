// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpatialExperienceContext } from '../../spatial/SpatialExperienceContext';
import type { SpatialExperiencePhase } from '../../spatial/SpatialExperienceContext';
import { LandingPage } from './LandingPage';

afterEach(cleanup);

describe('entry route handoff', () => {
  it('keeps the landing dismissed between shot completion and route replacement', () => {
    const page = (phase: SpatialExperiencePhase) => <SpatialExperienceContext.Provider value={{ phase, model: { nodes: [], edges: [] } as never, beginUniverseEntry: vi.fn(), ready: true, pendingEntry: false }}><LandingPage /></SpatialExperienceContext.Provider>;
    const view = render(page('landing'));
    expect(view.container.querySelector('main')?.hasAttribute('inert')).toBe(false);
    view.rerender(page('entering'));
    expect(view.container.querySelector('main')?.classList.contains('is-entering')).toBe(true);
    view.rerender(page('universe'));
    expect(view.container.querySelector('main')?.hasAttribute('inert')).toBe(true);
    expect(view.container.querySelector('main')?.classList.contains('is-entering')).toBe(true);
  });
});
