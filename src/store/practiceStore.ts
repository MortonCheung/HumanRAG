import { create } from 'zustand';
import { contentRepository } from '../services/content/ContentRepository';
import { evaluateAnswer } from '../ai/teaching/TeachingDecisionEngine';
import { useProgressStore } from './progressStore';
import { useUserStore } from './userStore';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';

/**
 * 刷题会话唯一来源（蓝图 §17.2）：当前题目序列、作答与标记。
 * 题目提交结果通过 recordAnswer 回写 progressStore。
 */

export interface PracticeAnswer {
  questionId: string;
  selected: string;
  correct: boolean;
  misconceptionId?: string;
  misconceptionText?: string;
}

interface PersistedPractice {
  sessionId: string | null;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, PracticeAnswer>;
  /** 标记为「待回顾」的题号集合。 */
  flaggedIds: string[];
  status: 'idle' | 'active' | 'finished';
}

interface PracticeState extends PersistedPractice {
  startSession: (sessionId: string, questionIds: string[]) => void;
  submitAnswer: (questionId: string, selected: string) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleFlag: (questionId: string) => void;
  finish: () => { ok: boolean; missing: number };
  resetSession: () => void;
}

const persisted = loadDomain<PersistedPractice>(DOMAIN_KEYS.practice);

function persist(state: PersistedPractice): void {
  saveDomain(DOMAIN_KEYS.practice, state);
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  sessionId: persisted?.sessionId ?? null,
  questionIds: persisted?.questionIds ?? [],
  currentIndex: persisted?.currentIndex ?? 0,
  answers: persisted?.answers ?? {},
  flaggedIds: persisted?.flaggedIds ?? [],
  status: persisted?.status ?? 'idle',

  startSession: (sessionId, questionIds) => {
    const next: PersistedPractice = {
      sessionId,
      questionIds,
      currentIndex: 0,
      answers: {},
      flaggedIds: [],
      status: 'active',
    };
    persist(next);
    set(next);
  },

  submitAnswer: (questionId, selected) => {
    const state = get();
    if (state.answers[questionId]) return;
    const question = contentRepository.getQuestion(questionId);
    if (!question) return;
    const evaluation = evaluateAnswer(question, selected);
    const answer: PracticeAnswer = {
      questionId,
      selected,
      correct: evaluation.correct,
      misconceptionId: evaluation.misconceptionId,
      misconceptionText: evaluation.misconceptionText,
    };

    const learnerId = useUserStore.getState().activeProfileId;
    useProgressStore.getState().recordAnswer({
      learnerId,
      questionId,
      nodeId: question.nodeIds[0],
      selected,
      correct: evaluation.correct,
      source: 'practice',
      misconceptionId: evaluation.misconceptionId,
    });

    const answers = { ...state.answers, [questionId]: answer };
    persist({ ...state, answers });
    set({ answers });
  },

  next: () => {
    const state = get();
    if (state.currentIndex < state.questionIds.length - 1) {
      const currentIndex = state.currentIndex + 1;
      persist({ ...state, currentIndex });
      set({ currentIndex });
    }
  },

  prev: () => {
    const state = get();
    if (state.currentIndex > 0) {
      const currentIndex = state.currentIndex - 1;
      persist({ ...state, currentIndex });
      set({ currentIndex });
    }
  },

  goTo: (index) => {
    const state = get();
    if (index >= 0 && index < state.questionIds.length) {
      persist({ ...state, currentIndex: index });
      set({ currentIndex: index });
    }
  },

  toggleFlag: (questionId) => {
    const state = get();
    const flagged = state.flaggedIds.includes(questionId)
      ? state.flaggedIds.filter((id) => id !== questionId)
      : [...state.flaggedIds, questionId];
    persist({ ...state, flaggedIds: flagged });
    set({ flaggedIds: flagged });
  },

  finish: () => {
    const state = get();
    const missing = state.questionIds.filter((questionId) => !state.answers[questionId]).length;
    if (state.status !== 'active' || state.questionIds.length === 0 || missing > 0) {
      return { ok: false, missing };
    }
    persist({ ...state, status: 'finished' });
    set({ status: 'finished' });
    return { ok: true, missing: 0 };
  },

  resetSession: () => {
    removeDomain(DOMAIN_KEYS.practice);
    set({ sessionId: null, questionIds: [], currentIndex: 0, answers: {}, flaggedIds: [], status: 'idle' });
  },
}));
