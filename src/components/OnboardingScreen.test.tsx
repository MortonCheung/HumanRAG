// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DOMAIN_KEYS } from '../services/persistence/demoPersistence';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { OnboardingScreen } from './OnboardingScreen';

describe('OnboardingScreen soft progression', () => {
  beforeEach(() => useKnowledgeStore.getState().resetKnowledge());
  afterEach(cleanup);

  it('allows all optional fields to remain empty and keeps the overview', async () => {
    render(<OnboardingScreen />);
    fireEvent.click(screen.getByRole('button', { name: '进入知识地图' }));

    await waitFor(() => expect(useKnowledgeStore.getState().profile).toEqual({ major: '', identity: '', goal: '' }));
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
    expect(useKnowledgeStore.getState().phase).toBe('overview');
  });

  it('persists only the optional values the user entered', async () => {
    render(<OnboardingScreen />);
    fireEvent.change(screen.getByLabelText('专业（可选）'), { target: { value: '软件工程' } });
    fireEvent.click(screen.getByRole('button', { name: '进入知识地图' }));

    await waitFor(() => expect(useKnowledgeStore.getState().profile).toEqual({ major: '软件工程', identity: '', goal: '' }));
    const envelope = JSON.parse(localStorage.getItem(DOMAIN_KEYS.knowledge) ?? '{}') as { data?: { profile?: unknown } };
    expect(envelope.data?.profile).toEqual({ major: '软件工程', identity: '', goal: '' });
  });
});
