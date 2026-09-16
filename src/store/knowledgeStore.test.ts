// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { DOMAIN_KEYS } from '../services/persistence/demoPersistence';
import { useKnowledgeStore } from './knowledgeStore';

describe('knowledgeStore spatial continuity', () => {
  beforeEach(() => {
    useKnowledgeStore.getState().resetKnowledge();
  });

  it('lets the camera check actual screen visibility even for nearby nodes', () => {
    useKnowledgeStore.getState().selectNode('goal-cs-graduate');
    const firstIntent = useKnowledgeStore.getState().cameraIntent;

    useKnowledgeStore.getState().selectNode('direction-408');
    expect(useKnowledgeStore.getState().cameraIntent).not.toBe(firstIntent);
    expect(useKnowledgeStore.getState().cameraIntent.nodeId).toBe('direction-408');
    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-cs-graduate');
  });

  it('keeps the user goal and selection when replaying entry', () => {
    useKnowledgeStore.getState().selectNode('direction-408');
    useKnowledgeStore.getState().prepareUniverseEntry();
    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-cs-graduate');
    expect(useKnowledgeStore.getState().selectedNodeId).toBe('direction-408');
  });

  it('creates a node camera intent when the next node is far away', () => {
    useKnowledgeStore.getState().selectNode('direction-408');
    const firstIntent = useKnowledgeStore.getState().cameraIntent;
    useKnowledgeStore.getState().selectNode('practice-linked-list');
    expect(useKnowledgeStore.getState().cameraIntent).not.toBe(firstIntent);
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('node');
    expect(useKnowledgeStore.getState().cameraIntent.nodeId).toBe('practice-linked-list');
  });

  it('uses a branch only as temporary node focus and can explicitly gather the overview', () => {
    useKnowledgeStore.getState().selectNode('direction-ai-engineering');
    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-ai-engineer');
    expect(useKnowledgeStore.getState().nodeFocusOriginGoalId).toBeNull();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('node');

    useKnowledgeStore.getState().returnOverview();
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
    expect(useKnowledgeStore.getState().selectedNodeId).toBeNull();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
  });

  it('closes detail with the exact same full reset state as the top reset action', () => {
    useKnowledgeStore.getState().selectGoal('goal-cs-graduate');
    useKnowledgeStore.getState().selectNode('goal-frontend-engineer');
    useKnowledgeStore.getState().hoverNode('knowledge-rag');
    useKnowledgeStore.getState().openPanel('search');
    useKnowledgeStore.setState({ relationMode: 'all', isPathRibbonOpen: true });
    const focusedIntent = useKnowledgeStore.getState().cameraIntent;
    useKnowledgeStore.getState().closeNodeDetail();
    expect(useKnowledgeStore.getState().cameraIntent).not.toBe(focusedIntent);
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
    expect(useKnowledgeStore.getState().cameraIntent.nodeId).toBeUndefined();
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
    expect(useKnowledgeStore.getState().nodeFocusOriginGoalId).toBeNull();
    expect(useKnowledgeStore.getState().phase).toBe('overview');
    expect(useKnowledgeStore.getState().selectedNodeId).toBeNull();
    expect(useKnowledgeStore.getState().hoveredNodeId).toBeNull();
    expect(useKnowledgeStore.getState().activePanel).toBeNull();
    expect(useKnowledgeStore.getState().relationMode).toBe('primary');
    expect(useKnowledgeStore.getState().isPathRibbonOpen).toBe(false);
  });

  it('closes detail to the full overview when no goal is active', () => {
    useKnowledgeStore.getState().selectNode('knowledge-tcp');
    useKnowledgeStore.getState().closeNodeDetail();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
    expect(useKnowledgeStore.getState().phase).toBe('overview');
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
  });

  it('preserves the original context while moving between node details', () => {
    useKnowledgeStore.getState().selectGoal('goal-cs-graduate');
    useKnowledgeStore.getState().selectNode('knowledge-tcp');
    useKnowledgeStore.getState().selectNode('knowledge-rag');

    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-ai-engineer');
    expect(useKnowledgeStore.getState().nodeFocusOriginGoalId).toBe('goal-cs-graduate');

    useKnowledgeStore.getState().closeNodeDetail();
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
    expect(useKnowledgeStore.getState().cameraIntent.nodeId).toBeUndefined();
  });

  it('clears the transient origin when a durable navigation action takes over', () => {
    useKnowledgeStore.getState().selectNode('knowledge-rag');
    useKnowledgeStore.getState().selectGoal('goal-frontend-engineer');
    expect(useKnowledgeStore.getState().nodeFocusOriginGoalId).toBeNull();

    useKnowledgeStore.getState().selectNode('knowledge-tcp');
    useKnowledgeStore.getState().returnOverview();
    expect(useKnowledgeStore.getState().nodeFocusOriginGoalId).toBeNull();
  });

  it('never persists the temporary node branch, including during a settings write', () => {
    useKnowledgeStore.getState().selectGoal('goal-cs-graduate');
    useKnowledgeStore.getState().selectNode('knowledge-rag');
    useKnowledgeStore.getState().setQualityPreference('performance');

    const envelope = JSON.parse(localStorage.getItem(DOMAIN_KEYS.knowledge) ?? '{}') as {
      data?: { selectedGoalId?: string | null };
    };
    expect(envelope.data?.selectedGoalId).toBe('goal-cs-graduate');
  });
});
