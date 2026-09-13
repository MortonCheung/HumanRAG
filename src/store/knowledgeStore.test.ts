import { beforeEach, describe, expect, it } from 'vitest';
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

  it('changes branch focus for any node and can explicitly gather the overview', () => {
    useKnowledgeStore.getState().selectNode('direction-ai-engineering');
    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-ai-engineer');
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('node');

    useKnowledgeStore.getState().returnOverview();
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
    expect(useKnowledgeStore.getState().selectedNodeId).toBeNull();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
  });

  it('closes detail and returns the camera to the current goal in the same transition', () => {
    useKnowledgeStore.getState().selectNode('goal-frontend-engineer');
    const focusedIntent = useKnowledgeStore.getState().cameraIntent;
    useKnowledgeStore.getState().closeNodeDetail();
    expect(useKnowledgeStore.getState().cameraIntent).not.toBe(focusedIntent);
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('goal');
    expect(useKnowledgeStore.getState().cameraIntent.nodeId).toBe('goal-frontend-engineer');
    expect(useKnowledgeStore.getState().phase).toBe('goalFocused');
    expect(useKnowledgeStore.getState().selectedNodeId).toBeNull();
    expect(useKnowledgeStore.getState().hoveredNodeId).toBeNull();
  });

  it('closes detail to the full overview when no goal is active', () => {
    useKnowledgeStore.setState({ selectedGoalId: null, selectedNodeId: 'knowledge-tcp', phase: 'nodeFocused' });
    useKnowledgeStore.getState().closeNodeDetail();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
    expect(useKnowledgeStore.getState().phase).toBe('overview');
  });
});
