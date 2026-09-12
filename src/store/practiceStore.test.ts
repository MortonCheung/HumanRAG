import { beforeEach, describe, expect, it } from 'vitest';
import { contentRepository } from '../services/content/ContentRepository';
import { questionIdsForNode } from '../data/v6/generators/generateQuestionVariants';
import { usePracticeStore } from './practiceStore';
import { useProgressStore } from './progressStore';
import { deriveLearningStatus } from '../features/progress/learningStatus';
import { useUserStore } from './userStore';

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
    useProgressStore.setState({ answerRecords: [], evidenceRecords: [], misconceptionRecords: [], remediationTasks: [], masteryByNode: [], taskExposures: [], storageError: null });
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

  it('训练只写入练习证据，不生成验证完成清单', () => {
    const questionIds = questionIdsForNode('knowledge-linear-list').slice(0, 2);
    usePracticeStore.getState().startSession('test-train-evidence', questionIds, { mode: 'train' });
    for (const questionId of questionIds) usePracticeStore.getState().submitAnswer(questionId, correctSelection(questionId));

    const evidence = useProgressStore.getState().evidenceRecords;
    expect(evidence).toHaveLength(2);
    expect(evidence.every((entry) => entry.source === 'practice' && entry.verificationQuestionIds === undefined)).toBe(true);
  });

  it('独立验证完成同一知识点的全部新题后写入强证据', () => {
    const learnerId = useUserStore.getState().activeProfileId;
    const nodeId = 'knowledge-linear-list';
    const questionIds = questionIdsForNode(nodeId).slice(0, 2);
    usePracticeStore.getState().startSession('test-verify-evidence', questionIds, { mode: 'verify' });
    for (const questionId of questionIds) usePracticeStore.getState().submitAnswer(questionId, correctSelection(questionId));

    const evidence = useProgressStore.getState().evidenceRecords;
    expect(evidence.every((entry) => entry.source === 'independent-check' && entry.assistance === 'independent')).toBe(true);
    expect(evidence.at(-1)?.verificationQuestionIds).toEqual(questionIds);
    expect(deriveLearningStatus(nodeId, learnerId, evidence).status).toBe('verified');
  });

  it('同一范围的训练与验证会话彼此隔离并可恢复', () => {
    const questionIds = questionIdsForNode('knowledge-linear-list').slice(0, 2);
    usePracticeStore.getState().startSession('test-mode-sessions', questionIds, { mode: 'verify' });
    usePracticeStore.getState().submitAnswer(questionIds[0], correctSelection(questionIds[0]));
    usePracticeStore.getState().startSession('test-mode-sessions', questionIds, { mode: 'train' });
    expect(usePracticeStore.getState().answers).toEqual({});
    usePracticeStore.getState().startSession('test-mode-sessions', questionIds, { mode: 'verify' });
    expect(usePracticeStore.getState().answers[questionIds[0]]).toBeDefined();
    expect(usePracticeStore.getState().mode).toBe('verify');
  });
});
