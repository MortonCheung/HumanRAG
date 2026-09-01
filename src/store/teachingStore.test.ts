import { beforeEach, describe, expect, it } from 'vitest';
import { REMEDIATION_EXHAUSTED_NEXT, resolveNextStepId } from '../ai/teaching/TeachingDecisionEngine';
import type { TeachingStep, TeachingNextRule } from '../data/v6/schemas/teachingSchema';
import { TEACHING_STEPS_BY_ID, TEACHING_UNITS } from '../data/v6/generators/generateTeachingUnit';
import { getQuestion } from '../data/v6/generators/generateQuestionVariants';
import { useTeachingStore } from './teachingStore';

function stepOf(kind: TeachingStep['kind'], nextRules: TeachingNextRule[]): TeachingStep {
  return {
    id: `test-${kind}`,
    unitId: 'tu-test',
    kind,
    title: kind,
    bodyBlocks: [{ kind: 'paragraph', text: '占位' }],
    nextRules,
  };
}

const CHECK_RULES: TeachingNextRule[] = [
  { condition: { kind: 'score-at-least', threshold: 0.8 }, next: 'summary' },
  { condition: { kind: 'always' }, next: 'remediation' },
];

const DIAGNOSTIC_RULES: TeachingNextRule[] = [
  { condition: { kind: 'diagnostic-below', threshold: 0.6 }, next: 'remediation' },
  { condition: { kind: 'always' }, next: 'explanation' },
];

describe('教学决策：四条分支', () => {
  it('诊断合格 → 进入讲解', () => {
    expect(resolveNextStepId(stepOf('diagnostic', DIAGNOSTIC_RULES), { diagnosticScore: 0.8, checkScore: 0 })).toBe(
      'explanation',
    );
  });

  it('独立检查达标 → 总结', () => {
    expect(resolveNextStepId(stepOf('independent-check', CHECK_RULES), { diagnosticScore: 1, checkScore: 1 })).toBe(
      'summary',
    );
  });

  it('独立检查未达标且补救 < 2 → 复教', () => {
    const step = stepOf('independent-check', CHECK_RULES);
    expect(resolveNextStepId(step, { diagnosticScore: 1, checkScore: 0.33, remediationCount: 0 })).toBe('remediation');
    expect(resolveNextStepId(step, { diagnosticScore: 1, checkScore: 0.33, remediationCount: 1 })).toBe('remediation');
  });

  it('独立检查未达标且补救 >= 2 → 终止（无死循环）', () => {
    expect(resolveNextStepId(stepOf('independent-check', CHECK_RULES), { diagnosticScore: 1, checkScore: 0.33, remediationCount: 2 })).toBe(
      REMEDIATION_EXHAUSTED_NEXT,
    );
  });
});

function correctSelection(questionId: string): string {
  const question = getQuestion(questionId);
  if (!question) throw new Error(`题目缺失：${questionId}`);
  const answer = question.answer;
  if (answer.kind === 'choice' || answer.kind === 'ordering') return answer.optionIds.join(',');
  if (answer.kind === 'boolean') return String(answer.value);
  return answer.value;
}

function wrongSelection(questionId: string): string {
  const question = getQuestion(questionId);
  if (!question) throw new Error(`题目缺失：${questionId}`);
  const answer = question.answer;
  if (answer.kind === 'choice') {
    const others = (question.options ?? []).map((option) => option.id).filter((id) => !answer.optionIds.includes(id));
    return others[0] ?? '';
  }
  if (answer.kind === 'ordering') return [...answer.optionIds].reverse().join(',');
  if (answer.kind === 'boolean') return String(!answer.value);
  return '错误的答案';
}

function currentStep() {
  const stepId = useTeachingStore.getState().currentStepId;
  return stepId ? TEACHING_STEPS_BY_ID.get(stepId) : undefined;
}

function submitStep(choose: (questionId: string) => string) {
  const step = currentStep();
  const questionIds = step?.questionIds ?? [];
  const selections: Record<string, string> = {};
  for (const id of questionIds) selections[id] = choose(id);
  const result = useTeachingStore.getState().submitCurrentStep(selections);
  expect(result.ok).toBe(true);
}

describe('教学会话：复测与终止', () => {
  beforeEach(() => {
    useTeachingStore.getState().resetSession();
  });

  it('弱诊断进入含前置补充的正式讲解，不误入独立检查复教回路', () => {
    const unit = TEACHING_UNITS[0];
    useTeachingStore.getState().startSession(unit.id);

    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('diagnostic');
    submitStep(wrongSelection);

    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('explanation');
    expect(currentStep()?.title).toContain('讲解');
    expect(currentStep()?.bodyBlocks[0]).toMatchObject({ kind: 'paragraph' });
    expect(currentStep()?.bodyBlocks[0]).toHaveProperty('text', expect.stringContaining('前置知识补充'));
    expect(useTeachingStore.getState().attempt).toBe(1);
    expect(useTeachingStore.getState().remediationCount).toBe(0);
  });

  it('全对路径最终掌握完成，attempt 保持 1', () => {
    const unit = TEACHING_UNITS[0];
    useTeachingStore.getState().startSession(unit.id);

    // objective → diagnostic
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('diagnostic');
    submitStep(correctSelection);

    // diagnostic(对) → explanation → worked-example → guided-practice
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('explanation');
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('worked-example');
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('guided-practice');
    submitStep(correctSelection);

    // guided(对) → independent-check（attempt 1）
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('independent-check');
    expect(useTeachingStore.getState().attempt).toBe(1);
    submitStep(correctSelection);

    // independent-check(对) → summary → end
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('summary');
    useTeachingStore.getState().advance();

    const state = useTeachingStore.getState();
    expect(state.status).toBe('finished');
    expect(state.outcome).toBe('mastered');
    expect(state.attempt).toBe(1);
  });

  it('两轮复教后仍未通过则终止，attempt 与补救次数正确，无死循环', () => {
    const unit = TEACHING_UNITS[0];
    useTeachingStore.getState().startSession(unit.id);

    // 快速推进到 independent-check（全对通过诊断与引导）。
    useTeachingStore.getState().advance();
    submitStep(correctSelection);
    useTeachingStore.getState().advance(); // explanation
    useTeachingStore.getState().advance(); // worked-example
    useTeachingStore.getState().advance(); // guided-practice
    submitStep(correctSelection);
    useTeachingStore.getState().advance(); // independent-check attempt 1

    expect(currentStep()?.kind).toBe('independent-check');

    // 第一轮：答错 → 复教 → 重测（attempt 2）。
    submitStep(wrongSelection);
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('remediation');
    expect(useTeachingStore.getState().remediationCount).toBe(1);
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('independent-check');
    expect(useTeachingStore.getState().attempt).toBe(2);

    // 第二轮：答错 → 复教 → 重测（attempt 3）。
    submitStep(wrongSelection);
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('remediation');
    expect(useTeachingStore.getState().remediationCount).toBe(2);
    useTeachingStore.getState().advance();
    expect(currentStep()?.kind).toBe('independent-check');
    expect(useTeachingStore.getState().attempt).toBe(3);

    // 第三轮：答错 → 终止，推荐前置教学。
    submitStep(wrongSelection);
    useTeachingStore.getState().advance();

    const state = useTeachingStore.getState();
    expect(state.status).toBe('finished');
    expect(state.outcome).toBe('remediation-exhausted');
    expect(state.remediationCount).toBe(2);
    expect(state.attempt).toBe(3);
  });
});
