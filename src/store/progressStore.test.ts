import { beforeEach, describe, expect, it } from 'vitest';
import { useProgressStore } from './progressStore';
import { DEMO_HISTORY } from '../data/v6/generators/generateDemoHistory';

const learnerId = DEMO_HISTORY.profiles[0].id;

function masteryFor(targetLearner: string, nodeId: string) {
  return useProgressStore
    .getState()
    .masteryByNode.filter((mastery) => mastery.learnerId === targetLearner && mastery.nodeId === nodeId);
}

describe('progressStore：掌握度按 learnerId + nodeId 隔离', () => {
  beforeEach(() => {
    useProgressStore.getState().reset();
  });

  it('同一学习者同一节点只有一条 MasteryState（重复作答不追加）', () => {
    const nodeId = 'node-test';
    useProgressStore.getState().recordAnswer({
      learnerId,
      questionId: 'q1',
      nodeId,
      selected: 'a',
      correct: true,
      source: 'practice',
    });
    useProgressStore.getState().recordAnswer({
      learnerId,
      questionId: 'q2',
      nodeId,
      selected: 'b',
      correct: false,
      source: 'practice',
    });
    expect(masteryFor(learnerId, nodeId)).toHaveLength(1);
  });

  it('不同学习者的掌握度互不影响', () => {
    const otherId = DEMO_HISTORY.profiles[1].id;
    const nodeId = 'node-test';
    useProgressStore.getState().recordAnswer({
      learnerId,
      questionId: 'q1',
      nodeId,
      selected: 'a',
      correct: true,
      source: 'practice',
    });
    expect(masteryFor(learnerId, nodeId)).toHaveLength(1);
    expect(masteryFor(otherId, nodeId)).toHaveLength(0);
  });
});
