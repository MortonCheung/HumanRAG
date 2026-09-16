import { create } from 'zustand';
import { contentRepository } from '../services/content/ContentRepository';
import { evaluateAnswer } from '../ai/teaching/TeachingDecisionEngine';
import { useProgressStore } from './progressStore';
import { useUserStore } from './userStore';
import { DOMAIN_KEYS, loadDomain, removeDomain, trySaveDomain } from '../services/persistence/demoPersistence';
import { TCP_VERSION, getTcpTask, parseTcpResponse, tcpTaskSignature, tcpTaskResultKeys } from '../data/v6/handcrafted/tcpLesson';

export interface PracticeAnswer { questionId: string; selected: string; correct: boolean; misconceptionId?: string; misconceptionText?: string }
export type PracticeMode = 'train' | 'verify' | 'exam';
interface PracticeSnapshot {
  learnerId: string;
  runId: string;
  sessionId: string | null;
  mode: PracticeMode;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, PracticeAnswer>;
  drafts: Record<string, string>;
  flaggedIds: string[];
  status: 'idle' | 'active' | 'finished';
}
interface PersistedPractice extends PracticeSnapshot { sessions: Record<string, PracticeSnapshot> }
interface PracticeState extends PersistedPractice {
  storageError: string | null;
  startSession: (sessionId: string, questionIds: string[], options?: boolean | { restart?: boolean; mode?: PracticeMode }) => void;
  setDraft: (questionId: string, selected: string) => void;
  submitAnswer: (questionId: string, selected: string) => boolean;
  retrySave: () => boolean;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleFlag: (questionId: string) => void;
  finish: () => { ok: boolean; missing: number };
  resetSession: () => void;
}
const persisted = loadDomain<Partial<PersistedPractice>>(DOMAIN_KEYS.practice);
const initialLearner = useUserStore.getState().activeProfileId;
const empty = (mode: PracticeMode = 'train'): PracticeSnapshot => ({ learnerId: initialLearner, runId: '', sessionId: null, mode, questionIds: [], currentIndex: 0, answers: {}, drafts: {}, flaggedIds: [], status: 'idle' });
function snapshot(state: PracticeSnapshot): PracticeSnapshot {
  const { learnerId, runId, sessionId, mode, questionIds, currentIndex, answers, drafts, flaggedIds, status } = state;
  return { learnerId, runId, sessionId, mode, questionIds, currentIndex, answers, drafts, flaggedIds, status };
}

function restoreSnapshot(value: PracticeSnapshot | (Omit<PracticeSnapshot, 'mode'> & { mode?: PracticeMode })): PracticeSnapshot {
  return { ...value, mode: value.mode ?? 'train' };
}

function sessionKey(learnerId: string, mode: PracticeMode, sessionId: string | null): string {
  return `${learnerId}:${mode}:${sessionId}`;
}

export const usePracticeStore = create<PracticeState>((set, get) => {
  const save = (next: PracticeSnapshot, keepDraft = false): boolean => {
    const sessions = { ...get().sessions, [sessionKey(next.learnerId, next.mode, next.sessionId)]: snapshot(next) };
    if (!trySaveDomain(DOMAIN_KEYS.practice, { ...snapshot(next), sessions })) {
      set({ ...(keepDraft ? { drafts: next.drafts } : {}), storageError: '练习进度未保存，当前输入仍保留。请重试。' });
      return false;
    }
    set({ ...next, sessions, storageError: null }); return true;
  };
  return {
    ...empty(), ...persisted, learnerId: persisted?.learnerId ?? initialLearner, runId: persisted?.runId ?? crypto.randomUUID(), mode: persisted?.mode ?? 'train', drafts: persisted?.drafts ?? {}, sessions: Object.fromEntries(Object.entries(persisted?.sessions ?? {}).map(([key, value]) => [key, restoreSnapshot(value)])), storageError: null,
    startSession: (sessionId, questionIds, options = false) => {
      const state = get();
      const learnerId = useUserStore.getState().activeProfileId;
      const restart = typeof options === 'boolean' ? options : options.restart ?? false;
      const mode = typeof options === 'boolean' ? 'train' : options.mode ?? 'train';
      const saved = state.sessions[sessionKey(learnerId, mode, sessionId)]
        ?? (mode === 'train' ? state.sessions[`${learnerId}:${sessionId}`] : undefined);
      if (!restart && saved && saved.questionIds.every((id) => contentRepository.getQuestion(id))) { save(saved); return; }
      if (!restart && state.learnerId === learnerId && state.sessionId === sessionId && state.mode === mode) return;
      save({ ...empty(mode), learnerId, runId: crypto.randomUUID(), sessionId, questionIds, status: 'active' });
    },
    setDraft: (questionId, selected) => {
      const state = get();
      if (state.learnerId !== useUserStore.getState().activeProfileId || state.answers[questionId] || !state.questionIds.includes(questionId)) return;
      save({ ...state, drafts: { ...state.drafts, [questionId]: selected } }, true);
    },
    retrySave: () => save(get()),
    submitAnswer: (questionId, selected) => {
      const state = get();
      if (state.learnerId !== useUserStore.getState().activeProfileId || !state.questionIds.includes(questionId)) return false;
      if (state.answers[questionId]) return true;
      const question = contentRepository.getQuestion(questionId);
      if (!question || !selected.trim()) return false;
      const task = getTcpTask(questionId);
      const response = task ? parseTcpResponse(selected) : undefined;
      if (task && (!response || response.values.length !== (task.role === 'observe' ? 2 : task.rounds.length))) { set({ storageError: '请填写全部数值，并选择计算依据。' }); return false; }
      const evaluation = evaluateAnswer(question, selected);
      const eventId = `practice:${state.mode}:${state.runId}:${questionId}`;
      const progress = useProgressStore.getState();
      const exposed = task ? progress.taskExposures.some((entry) => entry.learnerId === state.learnerId && entry.eventId !== eventId && (entry.signature === tcpTaskSignature(task) || tcpTaskResultKeys(task).some((key) => entry.resultKeys.includes(key)))) : progress.answerRecords.some((entry) => entry.learnerId === state.learnerId && entry.questionId === questionId);
      const answer: PracticeAnswer = { questionId, selected, ...evaluation };
      const expected = question.answer.kind === 'text' ? question.answer.value : question.answer.kind === 'boolean' ? String(question.answer.value) : question.answer.optionIds.join(',');
      const verificationQuestionIds = state.mode === 'train' ? undefined : state.questionIds.filter((id) => {
        const candidate = contentRepository.getQuestion(id);
        return candidate?.nodeIds[0] === question.nodeIds[0];
      });
      const completesNodeRound = Boolean(verificationQuestionIds && verificationQuestionIds.length >= 2
        && verificationQuestionIds.every((id) => id === questionId || state.answers[id]));
      if (!progress.recordAnswer({ learnerId: state.learnerId, questionId, nodeId: question.nodeIds[0], selected, correct: evaluation.correct, source: state.mode === 'train' ? 'practice' : 'independent-check', misconceptionId: evaluation.misconceptionId, evidence: { eventId, sessionId: state.runId, attempt: 1, contentVersion: task ? TCP_VERSION : 'question-snapshot-v1', taskRole: task?.role, assistance: 'independent', firstExposure: !exposed, ...(completesNodeRound ? { verificationQuestionIds } : {}), snapshot: { stem: question.stem, selected: question.options ? selected.split(',').map((id) => question.options?.find((option) => option.id === id)?.text ?? id).join('；') : selected, expected: question.options ? expected.split(',').map((id) => question.options?.find((option) => option.id === id)?.text ?? id).join('；') : expected, explanation: question.explanation } } })) { set({ storageError: '作答记录未保存，请重试提交。' }); return false; }
      if (task && !progress.markExposure({ learnerId: state.learnerId, signature: tcpTaskSignature(task), resultKeys: tcpTaskResultKeys(task), eventId })) { set({ storageError: '结果曝光记录未保存，请重试提交。' }); return false; }
      return save({ ...state, answers: { ...state.answers, [questionId]: answer }, drafts: { ...state.drafts, [questionId]: selected } });
    },
    next: () => get().goTo(get().currentIndex + 1),
    prev: () => get().goTo(get().currentIndex - 1),
    goTo: (index) => { const state = get(); if (Number.isInteger(index) && index >= 0 && index < state.questionIds.length) save({ ...state, currentIndex: index }); },
    toggleFlag: (questionId) => { const state = get(); if (state.questionIds.includes(questionId)) save({ ...state, flaggedIds: state.flaggedIds.includes(questionId) ? state.flaggedIds.filter((id) => id !== questionId) : [...state.flaggedIds, questionId] }); },
    finish: () => {
      const state = get();
      const missing = state.questionIds.filter((id) => !state.answers[id]).length;
      if (state.status !== 'active' || state.questionIds.length === 0 || state.learnerId !== useUserStore.getState().activeProfileId) return { ok: false, missing };
      return { ok: save({ ...state, status: 'finished' }), missing };
    },
    resetSession: () => { removeDomain(DOMAIN_KEYS.practice); set({ ...empty(), learnerId: useUserStore.getState().activeProfileId, sessions: {}, storageError: null }); },
  };
});
