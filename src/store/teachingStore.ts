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
import { DOMAIN_KEYS, loadDomain, removeDomain, trySaveDomain } from '../services/persistence/demoPersistence';
import { TCP_UNIT_ID, TCP_NODE_ID, TCP_VERSION, TCP_FRAGMENTS, getTcpTask, getTcpQuestion, evaluateTcpTask, parseTcpResponse, tcpTaskSignature, tcpTaskResultKeys, freshTcpPair, type TcpDifficulty } from '../data/v6/handcrafted/tcpLesson';

export interface PracticeReturnContext { learnerId: string; sessionId: string; path: string; questionId: string; selected: string; misconceptionId?: string }
export interface TcpSession {
  id: string;
  version: string;
  learnerId: string;
  stage: 'ready' | 'diagnostic' | 'clarification' | 'teaching' | 'guided' | 'independent' | 'complete' | 'paused';
  difficulty: TcpDifficulty;
  attempt: number;
  taskIds: string[];
  taskIndex: number;
  drafts: Record<string, string>;
  hints: string[];
  presented: string[];
  answers: Array<{ questionId: string; eventId: string; selected: string; correct: boolean; independent: boolean; attempt: number }>;
  feedback: { correct: boolean; independent: boolean; text: string; difficulty: TcpDifficulty } | null;
  decision: string;
  pauseReason?: string;
  practiceReturn?: PracticeReturnContext;
  pendingDifficulty?: TcpDifficulty;
  restartPending?: boolean;
}

export function currentTcpTaskId(session: TcpSession): string | undefined {
  if (session.stage === 'diagnostic') return 'tcp-diagnostic-v1';
  if (session.stage === 'clarification') return 'tcp-clarification-v1';
  if (session.stage === 'guided') return 'tcp-guided-v1';
  if (session.stage === 'independent') return session.taskIds[session.taskIndex];
}
export function tcpEventId(session: TcpSession, questionId: string) { return `${session.id}:${session.stage}:${session.attempt}:${questionId}`; }

/**
 * 教学会话唯一来源（蓝图 §17.2）：当前步骤、作答与决策。
 * 作答结果通过 recordAnswer 写入 progressStore。
 */

interface PersistedTeaching {
  tcp?: TcpSession | null;
  tcpSessions?: Record<string, TcpSession>;
  unitId: string | null;
  currentStepId: string | null;
  completedStepIds: string[];
  attempt: number;
  remediationCount: number;
  outcome: TeachingOutcome;
  answers: SessionAnswer[];
  sessionId?: string;
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
  tcp: TcpSession | null;
  tcpSessions: Record<string, TcpSession>;
  storageError: string | null;
  ensureTcpSession: (practiceReturn?: PracticeReturnContext, restart?: boolean) => void;
  saveTcp: (session: TcpSession) => boolean;
  setTcpDraft: (selected: string) => void;
  presentTcpTask: () => boolean;
  requestTcpHint: () => void;
  submitTcp: () => void;
  advanceTcp: () => void;
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
  sessionId: string;
  startSession: (unitId: string) => void;
  goToStep: (stepId: string) => void;
  /** 评估当前步骤的全部题目并写入作答，返回是否全部作答完成。 */
  submitCurrentStep: (selections: Record<string, string>) => { ok: boolean; missing: number };
  /** 按当前上下文决策并推进到下一步骤。 */
  advance: () => void;
  resetSession: () => void;
}

const persisted = loadDomain<PersistedTeaching>(DOMAIN_KEYS.teaching);

function persist(state: TeachingState): boolean {
  return trySaveDomain(DOMAIN_KEYS.teaching, {
    unitId: state.unitId,
    currentStepId: state.currentStepId,
    completedStepIds: state.completedStepIds,
    attempt: state.attempt,
    remediationCount: state.remediationCount,
    outcome: state.outcome,
    answers: state.answers,
    tcp: state.tcp,
    tcpSessions: state.tcpSessions,
    sessionId: state.sessionId,
  });
}

export const useTeachingStore = create<TeachingState>((set, get) => ({
  tcp: persisted?.tcp?.version === TCP_VERSION ? persisted.tcp : null,
  tcpSessions: persisted?.tcpSessions ?? {},
  storageError: null,
  unitId: persisted?.unitId ?? null,
  currentStepId: persisted?.currentStepId ?? null,
  completedStepIds: persisted?.completedStepIds ?? [],
  answers: persisted?.answers ?? [],
  status: persisted?.unitId ? (persisted.outcome ? 'finished' : 'active') : 'idle',
  attempt: persisted?.attempt ?? 1,
  remediationCount: persisted?.remediationCount ?? 0,
  outcome: persisted?.outcome ?? null,
  sessionId: persisted?.sessionId ?? crypto.randomUUID(),

  saveTcp: (tcp) => {
    const state = get();
    const next = { ...state, tcp, tcpSessions: { ...state.tcpSessions, [tcp.learnerId]: tcp }, unitId: TCP_UNIT_ID };
    if (!trySaveDomain(DOMAIN_KEYS.teaching, next)) { set({ storageError: '教学进度未保存，当前输入仍保留。请重试。' }); return false; }
    set({ tcp, tcpSessions: next.tcpSessions, unitId: TCP_UNIT_ID, storageError: null });
    return true;
  },

  ensureTcpSession: (practiceReturn, restart = false) => {
    const learnerId = useUserStore.getState().activeProfileId;
    const state = get();
    const old = state.tcpSessions[learnerId];
    if (!restart && old?.version === TCP_VERSION && (!practiceReturn || old.practiceReturn?.sessionId === practiceReturn.sessionId && old.practiceReturn?.questionId === practiceReturn.questionId)) {
      state.saveTcp({ ...old, practiceReturn: practiceReturn?.learnerId === learnerId ? practiceReturn : old.practiceReturn });
      return;
    }
    const practiceTask = practiceReturn?.learnerId === learnerId ? getTcpTask(practiceReturn.questionId) : undefined;
    const difficulty = practiceTask ? evaluateTcpTask(practiceTask, practiceReturn!.selected).difficulty : 'unknown';
    state.saveTcp({ id: crypto.randomUUID(), version: TCP_VERSION, learnerId, stage: practiceTask && difficulty !== 'unknown' ? 'teaching' : 'ready', difficulty, attempt: 1, taskIds: [], taskIndex: 0, drafts: {}, hints: [], presented: [], answers: [], feedback: null, decision: practiceTask ? TCP_FRAGMENTS[difficulty].reason : '先看一次实际作答，再选择讲解。', practiceReturn: practiceReturn?.learnerId === learnerId ? practiceReturn : undefined });
  },

  setTcpDraft: (selected) => {
    const tcp = get().tcp;
    if (!tcp || tcp.learnerId !== useUserStore.getState().activeProfileId || tcp.feedback) return;
    const id = currentTcpTaskId(tcp);
    if (!id) return;
    const next = { ...tcp, drafts: { ...tcp.drafts, [tcpEventId(tcp, id)]: selected } };
    // Keep typing intact even if the browser temporarily denies storage.
    set({ tcp: next });
    get().saveTcp(next);
  },

  presentTcpTask: () => {
    const tcp = get().tcp;
    if (!tcp || tcp.learnerId !== useUserStore.getState().activeProfileId) return false;
    const task = getTcpTask(currentTcpTaskId(tcp) ?? '');
    if (!task) return false;
    const eventId = tcpEventId(tcp, task.id);
    const progress = useProgressStore.getState();
    if (tcp.stage === 'independent' && progress.taskExposures.some((entry) => entry.learnerId === tcp.learnerId && entry.eventId !== eventId && (entry.signature === tcpTaskSignature(task) || tcpTaskResultKeys(task).some((key) => entry.resultKeys.includes(key))))) {
      get().saveTcp({ ...tcp, stage: 'paused', pauseReason: '保留题已在其他操作中曝光，本轮没有新的验证题。' });
      return false;
    }
    if (tcp.presented.includes(eventId)) return true;
    if (!progress.markExposure({ learnerId: tcp.learnerId, signature: tcpTaskSignature(task), resultKeys: task.role === 'observe' ? tcpTaskResultKeys(task) : [], eventId })) { set({ storageError: useProgressStore.getState().storageError ?? '曝光记录未保存，请重试。' }); return false; }
    return get().saveTcp({ ...tcp, presented: [...tcp.presented, eventId] });
  },

  requestTcpHint: () => {
    const tcp = get().tcp;
    if (!tcp || tcp.feedback || tcp.learnerId !== useUserStore.getState().activeProfileId) return;
    const id = currentTcpTaskId(tcp);
    if (!id) return;
    const eventId = tcpEventId(tcp, id);
    if (!tcp.hints.includes(eventId)) get().saveTcp({ ...tcp, hints: [...tcp.hints, eventId] });
  },

  submitTcp: () => {
    const state = get();
    const tcp = state.tcp;
    if (!tcp || tcp.feedback || tcp.learnerId !== useUserStore.getState().activeProfileId) return;
    const task = getTcpTask(currentTcpTaskId(tcp) ?? '');
    if (!task) return;
    const eventId = tcpEventId(tcp, task.id);
    const selected = tcp.drafts[eventId] ?? '';
    const response = parseTcpResponse(selected);
    if (!response || response.values.length !== (task.role === 'observe' ? 2 : task.rounds.length)) { set({ storageError: '请填写全部数值，并选择计算依据。' }); return; }
    if (!state.presentTcpTask()) return;
    const question = getTcpQuestion(task.id)!;
    const evaluation = evaluateTcpTask(task, selected);
    const independent = tcp.stage === 'independent' && !tcp.hints.includes(eventId);
    const fragment = TCP_FRAGMENTS[evaluation.difficulty];
    const progress = useProgressStore.getState();
    if (!progress.recordAnswer({ learnerId: tcp.learnerId, questionId: task.id, nodeId: TCP_NODE_ID, selected, correct: evaluation.correct, source: tcp.stage === 'independent' ? 'independent-check' : tcp.stage === 'guided' ? 'guided-practice' : 'diagnostic', misconceptionId: evaluation.misconceptionId, evidence: { eventId, contentVersion: TCP_VERSION, sessionId: tcp.id, attempt: tcp.attempt, taskRole: task.role, assistance: tcp.hints.includes(eventId) ? 'hint' : tcp.stage === 'guided' ? 'demonstration' : 'independent', firstExposure: tcp.stage === 'independent', snapshot: { stem: question.stem, selected, expected: question.answer.kind === 'text' ? question.answer.value : '', explanation: question.explanation }, fragmentId: tcp.stage === 'diagnostic' ? undefined : TCP_FRAGMENTS[tcp.difficulty].id, decisionReason: evaluation.correct ? '数值与规则理由均正确。' : fragment.reason } })) { set({ storageError: '记录未保存，当前答案仍保留。请重试提交。' }); return; }
    if (!progress.markExposure({ learnerId: tcp.learnerId, signature: tcpTaskSignature(task), resultKeys: tcpTaskResultKeys(task), eventId })) { set({ storageError: '结果曝光记录未保存，请重试提交。' }); return; }
    state.saveTcp({ ...get().tcp!, feedback: { correct: evaluation.correct, independent, difficulty: evaluation.difficulty, text: question.explanation }, answers: [...tcp.answers.filter((answer) => answer.eventId !== eventId), { eventId, questionId: task.id, selected, correct: evaluation.correct, independent, attempt: tcp.attempt }] });
  },

  advanceTcp: () => {
    const state = get();
    const tcp = state.tcp;
    if (!tcp || tcp.learnerId !== useUserStore.getState().activeProfileId) return;
    const beginCheck = (session: TcpSession) => {
      const pair = freshTcpPair(useProgressStore.getState().taskExposures, session.learnerId);
      const attempt = session.attempt + (session.restartPending ? 1 : 0);
      state.saveTcp(pair.length === 2 ? { ...session, attempt, restartPending: false, stage: 'independent', taskIds: pair, taskIndex: 0, feedback: null, decision: `第 ${attempt} 轮：用两项新任务独立验证。` } : { ...session, stage: 'paused', feedback: null, pauseReason: '本轮没有一对新的验证题，已有记录已保留。' });
    };
    if (tcp.stage === 'ready') { state.saveTcp({ ...tcp, stage: 'diagnostic' }); return; }
    if (tcp.stage === 'teaching') {
      if (tcp.difficulty === 'window' && tcp.pendingDifficulty) state.saveTcp({ ...tcp, difficulty: tcp.pendingDifficulty, pendingDifficulty: undefined, decision: TCP_FRAGMENTS[tcp.pendingDifficulty].reason });
      else state.saveTcp({ ...tcp, stage: 'guided', feedback: null });
      return;
    }
    if (!tcp.feedback) return;
    if (tcp.stage === 'diagnostic' || tcp.stage === 'clarification') {
      if (tcp.feedback.correct) { beginCheck(tcp); return; }
      const difficulty = tcp.feedback.difficulty;
      state.saveTcp({ ...tcp, feedback: null, stage: difficulty === 'unknown' && tcp.stage === 'diagnostic' ? 'clarification' : 'teaching', difficulty, decision: difficulty === 'unknown' && tcp.stage === 'diagnostic' ? '答案与理由不足以区分原因，再看关键的一步。' : TCP_FRAGMENTS[difficulty].reason });
    } else if (tcp.stage === 'guided') beginCheck(tcp);
    else if (tcp.stage === 'independent') {
      if (tcp.feedback.correct && tcp.feedback.independent) {
        if (tcp.taskIndex === 0) state.saveTcp({ ...tcp, taskIndex: 1, feedback: null });
        else state.saveTcp({ ...tcp, stage: 'complete', feedback: null, decision: '本轮两项新任务均独立通过；不代表长期掌握。' });
      } else if (tcp.attempt >= 3) state.saveTcp({ ...tcp, stage: 'paused', feedback: null, pauseReason: '两次补教重启后仍未独立通过，本次结束，保留需要巩固的记录。' });
      else state.saveTcp({ ...tcp, stage: 'teaching', feedback: null, restartPending: true, difficulty: tcp.feedback.difficulty, decision: tcp.feedback.independent ? TCP_FRAGMENTS[tcp.feedback.difficulty].reason : '本轮使用了帮助，先回顾规则，再用一对新任务验证。' });
    }
  },

  startSession: (unitId) => {
    if (unitId === TCP_UNIT_ID) { get().ensureTcpSession(undefined, true); return; }
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
      sessionId: crypto.randomUUID(),
    };
    if (!persist(next)) { set({ storageError: '教学进度未保存，请重试。' }); return; }
    set({
      unitId,
      currentStepId: firstStepId,
      completedStepIds: [],
      answers: [],
      status: 'active',
      attempt: 1,
      remediationCount: 0,
      outcome: null,
      sessionId: next.sessionId,
      storageError: null,
    });
  },

  goToStep: (stepId) => {
    const state = get();
    if (!state.completedStepIds.includes(stepId)) return;
    const next = { ...state, currentStepId: stepId };
    if (!persist(next)) { set({ storageError: '教学进度未保存，请重试。' }); return; }
    set({ currentStepId: stepId, storageError: null });
  },

  submitCurrentStep: (selections) => {
    const state = get();
    const step = state.currentStepId ? contentRepository.getTeachingStep(state.currentStepId) : undefined;
    if (!step) return { ok: false, missing: 0 };
    const questionIds = step.questionIds ?? [];
    if (questionIds.every((id) => state.answers.some((answer) => answer.questionId === id && answer.stepId === step.id && answer.attempt === state.attempt))) return { ok: true, missing: 0 };
    const missing = questionIds.filter((id) => !selections[id]).length;
    if (missing > 0) return { ok: false, missing };

    const learnerId = useUserStore.getState().activeProfileId;
    const progress = useProgressStore.getState();
    const newAnswers: SessionAnswer[] = [];

    for (const questionId of questionIds) {
      const question = contentRepository.getQuestion(questionId);
      if (!question) { set({ storageError: '题目已变更，未记录本次提交。' }); return { ok: false, missing: 0 }; }
      if (state.answers.some((answer) => answer.questionId === questionId && answer.stepId === step.id && answer.attempt === state.attempt)) continue;
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
      const expected = question.answer.kind === 'text' ? question.answer.value : question.answer.kind === 'boolean' ? String(question.answer.value) : question.answer.optionIds.join(',');
      if (!progress.recordAnswer({
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
        evidence: { eventId: `${state.sessionId}:${step.id}:${state.attempt}:${questionId}`, sessionId: state.sessionId, attempt: state.attempt, contentVersion: 'question-snapshot-v1', assistance: step.kind === 'guided-practice' ? 'demonstration' : 'unknown', firstExposure: !progress.answerRecords.some((record) => record.questionId === questionId && record.learnerId === learnerId), snapshot: { stem: question.stem, selected: question.options ? selected.split(',').map((id) => question.options?.find((option) => option.id === id)?.text ?? id).join('；') : selected, expected, explanation: question.explanation } },
      })) { set({ storageError: '作答记录未保存，请重试提交。' }); return { ok: false, missing: 0 }; }
    }

    const nextAnswers = [...state.answers, ...newAnswers];
    if (!persist({ ...state, answers: nextAnswers })) { set({ storageError: '教学进度未保存，请重试提交。' }); return { ok: false, missing: 0 }; }
    set({ answers: nextAnswers, storageError: null });
    return { ok: true, missing: 0 };
  },

  advance: () => {
    const state = get();
    const step = state.currentStepId ? contentRepository.getTeachingStep(state.currentStepId) : undefined;
    if (!step) return;

    if ((step.questionIds ?? []).some((id) => !state.answers.some((answer) => answer.questionId === id && answer.stepId === step.id && answer.attempt === state.attempt))) return;

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
    if (!persist(next)) { set({ storageError: '教学进度未保存，请重试。' }); return; }
    set({
      currentStepId: next.currentStepId,
      completedStepIds: completed,
      status: next.status,
      attempt,
      remediationCount,
      outcome,
      storageError: null,
    });
  },

  resetSession: () => {
    removeDomain(DOMAIN_KEYS.teaching);
    set({
      tcp: null,
      tcpSessions: {},
      storageError: null,
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
