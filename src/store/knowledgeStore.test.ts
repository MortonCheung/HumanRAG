import { beforeEach, describe, expect, it } from 'vitest';
import { useKnowledgeStore } from './knowledgeStore';

describe('knowledgeStore spatial continuity', () => {
  beforeEach(() => {
    useKnowledgeStore.getState().resetKnowledge();
  });

  it('keeps the camera intent while switching nodes inside one tree', () => {
    useKnowledgeStore.getState().selectNode('goal-cs-graduate');
    const firstIntent = useKnowledgeStore.getState().cameraIntent;

    useKnowledgeStore.getState().selectNode('direction-408');
    expect(useKnowledgeStore.getState().cameraIntent).toBe(firstIntent);
    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-cs-graduate');
  });

  it('changes branch focus for any node and can explicitly gather the overview', () => {
    useKnowledgeStore.getState().selectNode('direction-ai-engineering');
    expect(useKnowledgeStore.getState().selectedGoalId).toBe('goal-ai-engineer');
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('goal');

    useKnowledgeStore.getState().returnOverview();
    expect(useKnowledgeStore.getState().selectedGoalId).toBeNull();
    expect(useKnowledgeStore.getState().selectedNodeId).toBeNull();
    expect(useKnowledgeStore.getState().cameraIntent.mode).toBe('overview');
  });

  it('does not move the camera when only closing node detail', () => {
    useKnowledgeStore.getState().selectNode('goal-frontend-engineer');
    const focusedIntent = useKnowledgeStore.getState().cameraIntent;
    useKnowledgeStore.getState().closeNodeDetail();
    expect(useKnowledgeStore.getState().cameraIntent).toBe(focusedIntent);
  });
});
