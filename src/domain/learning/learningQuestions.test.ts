// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useLearningQuestionStore } from './learningQuestions';

describe('learning question ledger', () => {
  beforeEach(() => useLearningQuestionStore.getState().reset());

  it('keeps a concrete question until the learner resolves it', () => {
    expect(useLearningQuestionStore.getState().addQuestion({ learnerId: 'learner', pointId: 'tcp', text: '  门限为什么在这里切换？  ' })).toBe(true);
    const question = useLearningQuestionStore.getState().questions[0];
    expect(question).toMatchObject({ learnerId: 'learner', pointId: 'tcp', text: '门限为什么在这里切换？', status: 'open' });
    expect(useLearningQuestionStore.getState().resolveQuestion(question.id)).toBe(true);
    expect(useLearningQuestionStore.getState().questions[0].status).toBe('resolved');
  });

  it('does not create an empty question', () => {
    expect(useLearningQuestionStore.getState().addQuestion({ learnerId: 'learner', pointId: 'tcp', text: '   ' })).toBe(false);
    expect(useLearningQuestionStore.getState().questions).toEqual([]);
  });
});
