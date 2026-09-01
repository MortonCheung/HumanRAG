import { create } from 'zustand';
import { contentRepository } from '../services/content/ContentRepository';
import type { TeachingStep } from '../data/v6/schemas/teachingSchema';
import {
  buildDecisionSentence,
  evaluateAnswer,
  REMEDIATION_EXHAUSTED_NEXT,
  resolveNextStepId,
  type TeachingContext,
} from '../ai/teaching/TeachingDecisionEngine';
import { useProgressStore } from './progressStore';
import { useUserStore } from './userStore';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';

/**
 * 教学会话唯一来源（蓝图 §17.2）：当前步骤、作答与决策。
 * 作答结果通过 recordAnswer 写入 progressStore。
 */

interface PersistedTeaching {
  unitId: string | null;
  currentStepId: string | null;
  completedStepIds: string[];
  attempt: number;
  remediationCount: number;
  outcome: TeachingOutcome;
  answers: SessionAnswer[];
}

export interface SessionAnswer {
  stepId: string;
  questionId: string;
  attempt: number;
  selected: string;
  correct: boolean;
  misconceptionId?: string;
  misconceptionText?: string;
  stepKind: TeachingStep['kind'];
  submittedAt: string;
}

/** 会话结束原因：掌握完成 / 补救耗尽 / 尚未结束。 */
export type TeachingOutcome = 'mastered' | 'remediation-exhausted' | null;

interface TeachingState {
  unitId: string | null;
  currentStepId: string | null;
  completedStepIds: string[];
  /** 本会话已提交的作答，按提交顺序排列（含历史 attempt，作为证据保留）。 */
  answers: SessionAnswer[];
  status: 'idle' | 'active' | 'finished';
  /** 当前独立检查是第几次作答（首次为 1，复教后递增）。 */
  attempt: number;
  /** 已完成补救轮数（独立检查重测循环，最多 2）。 */
  remediationCount: number;
  /** 会话结束原因。 */
  outcome: TeachingOutcome;
  startSession: (unitId: string) => void;
  goToStep: (stepId: string) => void;
  /** 评估当前步骤的全部题目并写入作答，返回是否全部作答完成。 */
  submitCurrentStep: (selections: Record<string, string>) => { ok: boolean; missing: number };
  /** 按当前上下文决策并推进到下一步骤。 */
  advance: () => void;
  resetSession: () => void;
}

const persisted = loadDomain<PersistedTeaching>(DOMAIN_KEYS.teaching);

function persist(state: TeachingState) {
  saveDomain(DOMAIN_KEYS.teaching, {
    unitId: state.unitId,
    currentStepId: state.currentStepId,
    completedStepIds: state.completedStepIds,
    attempt: state.attempt,
    remediationCount: state.remediationCount,
    outcome: state.outcome,
    answers: state.answers,
  });
}

export const useTeachingStore = create<TeachingState>((set, get) => ({
  unitId: persisted?.unitId ?? null,
  currentStepId: persisted?.currentStepId ?? null,
  completedStepIds: persisted?.completedStepIds ?? [],
  answers: persisted?.answers ?? [],
  status: persisted?.unitId ? (persisted.outcome ? 'finished' : 'active') : 'idle',
  attempt: persisted?.attempt ?? 1,
  remediationCount: persisted?.remediationCount ?? 0,
  outcome: persisted?.outcome ?? null,

  startSession: (unitId) => {
    const unit = contentRepository.getTeachingUnit(unitId);
    if (!unit) return;
    const firstStepId = unit.stepIds[0];
    const next: TeachingState = {
      ...get(),
      unitId,
      currentStepId: firstStepId,
      completedStepIds: [],
      answers: [],
      status: 'active',
      attempt: 1,
      remediationCount: 0,
      outcome: null,
    };
    persist(next);
    set({
      unitId,
      currentStepId: firstStepId,
      completedStepIds: [],
      answers: [],
      status: 'active',
      attempt: 1,
      remediationCount: 0,
      outcome: null,
    });
  },

  goToStep: (stepId) => {
    const state = get();
    if (!state.completedStepIds.includes(stepId)) return;
    const next = { ...state, currentStepId: stepId };
    persist(next);
    set({ currentStepId: stepId });
  },

  submitCurrentStep: (selections) => {
    const state = get();
    const step = state.currentStepId ? contentRepository.getTeachingStep(state.currentStepId) : undefined;
    if (!step) return { ok: false, missing: 0 };
    const questionIds = step.questionIds ?? [];
    const missing = questionIds.filter((id) => !selections[id]).length;
    if (missing > 0) return { ok: false, missing };

    const learnerId = useUserStore.getState().activeProfileId;
    const progress = useProgressStore.getState();
    const newAnswers: SessionAnswer[] = [];

    for (const questionId of questionIds) {
      const question = contentRepository.getQuestion(questionId);
      if (!question) continue;
      const selected = selections[questionId];
      const evaluation = evaluateAnswer(question, selected);
      newAnswers.push({
        stepId: step.id,
        questionId,
        attempt: state.attempt,
        selected,
        correct: evaluation.correct,
        misconceptionId: evaluation.misconceptionId,
        misconceptionText: evaluation.misconceptionText,
        stepKind: step.kind,
        submittedAt: new Date().toISOString(),
      });
      progress.recordAnswer({
        learnerId,
        questionId,
        nodeId: question.nodeIds[0],
        selected,
        correct: evaluation.correct,
        source:
          step.kind === 'diagnostic'
            ? 'diagnostic'
            : step.kind === 'guided-practice'
              ? 'guided-practice'
              : step.kind === 'independent-check'
                ? 'independent-check'
                : 'practice',
        misconceptionId: evaluation.misconceptionId,
      });
    }

    const nextAnswers = [...state.answers, ...newAnswers];
    persist({ ...state, answers: nextAnswers });
    set({ answers: nextAnswers });
    return { ok: true, missing: 0 };
  },

  advance: () => {
    const state = get();
    const step = state.currentStepId ? contentRepository.getTeachingStep(state.currentStepId) : undefined;
    if (!step) return;

    const diagnosticAnswers = state.answers.filter((entry) => entry.stepKind === 'diagnostic');
    const guidedAnswers = state.answers.filter((entry) => entry.stepKind === 'guided-practice');
    const checkAnswers = state.answers.filter(
      (entry) => entry.stepKind === 'independent-check' && entry.attempt === state.attempt,
    );

    const context: TeachingContext = {
      diagnosticScore:
        diagnosticAnswers.length > 0
          ? diagnosticAnswers.filter((entry) => entry.correct).length / diagnosticAnswers.length
          : 1,
      guidedMisconceptionId: guidedAnswers.find((entry) => !entry.correct)?.misconceptionId,
      checkScore:
        checkAnswers.length > 0
          ? checkAnswers.filter((entry) => entry.correct).length / checkAnswers.length
          : 0,
      remediationCount: state.remediationCount,
    };

    const nextStepId = resolveNextStepId(step, context);
    const completed = Array.from(new Set([...state.completedStepIds, step.id]));

    const mastered = nextStepId === 'end';
    const remediationExhausted = nextStepId === REMEDIATION_EXHAUSTED_NEXT;
    const finished = mastered || remediationExhausted;
    const nextStep = !finished ? contentRepository.getTeachingStep(nextStepId) : undefined;

    let attempt = state.attempt;
    let remediationCount = state.remediationCount;
    // 独立检查失败进入复教：补救轮数 + 1。
    if (nextStep?.kind === 'remediation' && step.kind === 'independent-check') {
      remediationCount += 1;
    }
    // 复教后回到已做过的独立检查（即重测）：attempt + 1。
    if (
      nextStep?.kind === 'independent-check' &&
      step.kind === 'remediation' &&
      state.completedStepIds.includes(nextStepId)
    ) {
      attempt += 1;
    }

    const outcome: TeachingOutcome = mastered
      ? 'mastered'
      : remediationExhausted
        ? 'remediation-exhausted'
        : null;

    const next = {
      ...state,
      currentStepId: finished ? step.id : nextStepId,
      completedStepIds: completed,
      status: (finished ? 'finished' : 'active') as TeachingState['status'],
      attempt,
      remediationCount,
      outcome,
    };
    persist(next);
    set({
      currentStepId: next.currentStepId,
      completedStepIds: completed,
      status: next.status,
      attempt,
      remediationCount,
      outcome,
    });
  },

  resetSession: () => {
    removeDomain(DOMAIN_KEYS.teaching);
    set({
      unitId: null,
      currentStepId: null,
      completedStepIds: [],
      answers: [],
      status: 'idle',
      attempt: 1,
      remediationCount: 0,
      outcome: null,
    });
  },
}));

/** 选择器：当前会话的决策上下文与决策句子。 */
export function currentTeachingContext(): {
  context: TeachingContext;
  decision: string;
} | null {
  const state = useTeachingStore.getState();
  if (!state.unitId || !state.currentStepId) return null;
  const step = contentRepository.getTeachingStep(state.currentStepId);
  const unit = contentRepository.getTeachingUnit(state.unitId);
  if (!step || !unit) return null;

  const diagnosticAnswers = state.answers.filter((entry) => entry.stepKind === 'diagnostic');
  const guidedAnswers = state.answers.filter((entry) => entry.stepKind === 'guided-practice');
  const checkAnswers = state.answers.filter(
    (entry) => entry.stepKind === 'independent-check' && entry.attempt === state.attempt,
  );

  const context: TeachingContext = {
    diagnosticScore:
      diagnosticAnswers.length > 0
        ? diagnosticAnswers.filter((entry) => entry.correct).length / diagnosticAnswers.length
        : 1,
    guidedMisconceptionId: guidedAnswers.find((entry) => !entry.correct)?.misconceptionId,
    checkScore:
      checkAnswers.length > 0
        ? checkAnswers.filter((entry) => entry.correct).length / checkAnswers.length
        : 0,
    remediationCount: state.remediationCount,
  };

  const nodeName = unit.stepIds.length > 0 ? unit.title.replace(/[「」]教学单元/g, '') : unit.title;
  const lastMisconceptionName = [...state.answers].reverse().find((entry) => entry.misconceptionText)?.misconceptionText;

  return {
    context,
    decision: buildDecisionSentence({
      stepKind: step.kind,
      context,
      nodeName,
      unitTitle: unit.title,
      lastMisconceptionName,
    }),
  };
}
