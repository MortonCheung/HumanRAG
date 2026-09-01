import { beforeEach, describe, expect, it } from 'vitest';
import { contentRepository } from '../services/content/ContentRepository';
import { questionIdsForNode } from '../data/v6/generators/generateQuestionVariants';
import { usePracticeStore } from './practiceStore';

function correctSelection(questionId: string): string {
  const question = contentRepository.getQuestion(questionId);
  if (!question) throw new Error(`题目缺失：${questionId}`);
  const answer = question.answer;
  if (answer.kind === 'choice' || answer.kind === 'ordering') return answer.optionIds.join(',');
  if (answer.kind === 'boolean') return String(answer.value);
  return answer.value;
}

describe('practiceStore：完成条件', () => {
  beforeEach(() => {
    usePracticeStore.getState().resetSession();
  });

  it('题目未全部作答时拒绝结束，并返回缺题数', () => {
    const questionIds = questionIdsForNode('knowledge-linear-list').slice(0, 2);
    expect(questionIds).toHaveLength(2);
    usePracticeStore.getState().startSession('test-incomplete', questionIds);
    usePracticeStore.getState().submitAnswer(questionIds[0], correctSelection(questionIds[0]));

    expect(usePracticeStore.getState().finish()).toEqual({ ok: false, missing: 1 });
    expect(usePracticeStore.getState().status).toBe('active');
  });

  it('全部作答后允许结束并返回成功', () => {
    const questionIds = questionIdsForNode('knowledge-linear-list').slice(0, 2);
    usePracticeStore.getState().startSession('test-complete', questionIds);
    for (const questionId of questionIds) {
      usePracticeStore.getState().submitAnswer(questionId, correctSelection(questionId));
    }

    expect(usePracticeStore.getState().finish()).toEqual({ ok: true, missing: 0 });
    expect(usePracticeStore.getState().status).toBe('finished');
  });

  it('空会话不能被标记为完成', () => {
    usePracticeStore.getState().startSession('test-empty', []);
    expect(usePracticeStore.getState().finish()).toEqual({ ok: false, missing: 0 });
    expect(usePracticeStore.getState().status).toBe('active');
  });
});
