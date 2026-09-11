import { create } from 'zustand';
import type {
  AnswerRecord,
  EvidenceRecord,
  MasteryState,
  MisconceptionRecord,
  RemediationTask,
} from '../data/v6/schemas/progressSchema';
import { DEMO_HISTORY } from '../data/v6/generators/generateDemoHistory';
import { MISCONCEPTIONS } from '../data/v6/catalogs/misconceptionCatalog';
import { DOMAIN_KEYS, loadDomain, removeDomain, trySaveDomain } from '../services/persistence/demoPersistence';
import type { TcpExposure } from '../data/v6/handcrafted/tcpLesson';
import { EvidenceRecordSchema } from '../data/v6/schemas/progressSchema';
import { deriveLearningStatus } from '../features/progress/learningStatus';

/**
 * 学习进度唯一来源（蓝图 §17.2）：EvidenceRecord、MasteryState、MisconceptionRecord。
 * 初始数据来自确定性生成器，教学/刷题会话的作答通过 recordAnswer 回写。
 */

interface PersistedProgress {
  learnerId: string;
  answerRecords: AnswerRecord[];
  evidenceRecords: EvidenceRecord[];
  misconceptionRecords: MisconceptionRecord[];
  remediationTasks: RemediationTask[];
  masteryByNode: MasteryState[];
  taskExposures: TcpExposure[];
}

interface ProgressState extends PersistedProgress {
  storageError: string | null;
  markExposure: (entry: Omit<TcpExposure, 'createdAt'>) => boolean;
  switchLearner: (learnerId: string) => void;
  recordAnswer: (input: {
    learnerId: string;
    questionId: string;
    nodeId: string;
    selected: string;
    correct: boolean;
    source: EvidenceRecord['source'];
    misconceptionId?: string;
    evidence?: Partial<Pick<EvidenceRecord, 'eventId' | 'contentVersion' | 'sessionId' | 'attempt' | 'taskRole' | 'assistance' | 'firstExposure' | 'verificationQuestionIds' | 'snapshot' | 'fragmentId' | 'decisionReason'>>;
  }) => boolean;
  completeRemediationTask: (taskId: string) => void;
  reset: () => void;
}

function seedAnswerSequence(): number {
  return DEMO_HISTORY.answerRecords.length;
}
function seedEvidenceSequence(): number {
  return DEMO_HISTORY.evidenceRecords.length;
}

const persisted = loadDomain<PersistedProgress>(DOMAIN_KEYS.progress);

function persistProgress(state: PersistedProgress): boolean {
  return trySaveDomain(DOMAIN_KEYS.progress, state);
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  learnerId: persisted?.learnerId ?? DEMO_HISTORY.profiles[0].id,
  answerRecords: persisted?.answerRecords ?? [...DEMO_HISTORY.answerRecords],
  evidenceRecords: persisted?.evidenceRecords ?? [...DEMO_HISTORY.evidenceRecords],
  misconceptionRecords: persisted?.misconceptionRecords ?? [...DEMO_HISTORY.misconceptionRecords],
  remediationTasks: persisted?.remediationTasks ?? [...DEMO_HISTORY.remediationTasks],
  masteryByNode: persisted?.masteryByNode ?? [...DEMO_HISTORY.masteryByNode],
  taskExposures: persisted?.taskExposures ?? [],
  storageError: null,

  markExposure: (entry) => {
    const state = get();
    if (state.taskExposures.some((item) => item.learnerId === entry.learnerId && item.signature === entry.signature && item.eventId === entry.eventId && entry.resultKeys.every((key) => item.resultKeys.includes(key)))) return true;
    const next = { ...state, taskExposures: [...state.taskExposures, { ...entry, createdAt: new Date().toISOString() }] };
    if (!persistProgress(next)) { set({ storageError: '记录未保存，请检查本地存储后重试。' }); return false; }
    set({ taskExposures: next.taskExposures, storageError: null });
    return true;
  },

  switchLearner: (learnerId) => {
    // Profiles share the persisted ledger, never replace live records with demo seeds.
    const next: PersistedProgress = {
      learnerId,
      answerRecords: get().answerRecords,
      evidenceRecords: get().evidenceRecords,
      misconceptionRecords: get().misconceptionRecords,
      remediationTasks: get().remediationTasks,
      masteryByNode: get().masteryByNode,
      taskExposures: get().taskExposures,
    };
    if (!persistProgress(next)) { set({ storageError: '记录未保存。' }); return; }
    set(next);
  },

  recordAnswer: (input) => {
    const state = get();
    if (input.evidence?.eventId && state.evidenceRecords.some((record) => record.learnerId === input.learnerId && record.eventId === input.evidence?.eventId)) return true;
    const now = new Date().toISOString();
    const answerRecord: AnswerRecord = {
      id: `ans-live-${seedAnswerSequence() + state.answerRecords.filter((r) => r.id.startsWith('ans-live')).length + 1}`,
      learnerId: input.learnerId,
      questionId: input.questionId,
      selected: input.selected,
      correct: input.correct,
      createdAt: now,
    };
    const evidenceRecord: EvidenceRecord = {
      id: `ev-live-${seedEvidenceSequence() + state.evidenceRecords.filter((r) => r.id.startsWith('ev-live')).length + 1}`,
      learnerId: input.learnerId,
      nodeId: input.nodeId,
      source: input.source,
      result: input.correct ? 'correct' : 'incorrect',
      misconceptionId: input.misconceptionId,
      weight: input.correct ? 0.9 : 0.6,
      createdAt: now,
      questionId: input.questionId,
      assistance: 'unknown',
      ...input.evidence,
    };
    if (!EvidenceRecordSchema.safeParse(evidenceRecord).success) { set({ storageError: '记录格式无效，结果仍保留在当前任务中。' }); return false; }

    let misconceptionRecords = state.misconceptionRecords;
    if (input.misconceptionId) {
      const existing = state.misconceptionRecords.find(
        (record) => record.learnerId === input.learnerId && record.misconceptionId === input.misconceptionId,
      );
      const entry = MISCONCEPTIONS.find((candidate) => candidate.id === input.misconceptionId) ?? (input.misconceptionId.startsWith('tcp-') ? { id: input.misconceptionId } : undefined);
      if (existing) {
        misconceptionRecords = state.misconceptionRecords.map((record) =>
          record.id === existing.id
            ? { ...record, occurrences: record.occurrences + 1, lastSeenAt: now, status: 'open' as const }
            : record,
        );
      } else if (entry) {
        misconceptionRecords = [
          ...state.misconceptionRecords,
          {
            id: `mis-live-${state.misconceptionRecords.filter((r) => r.id.startsWith('mis-live')).length + 1}`,
            learnerId: input.learnerId,
            misconceptionId: entry.id,
            nodeId: input.nodeId,
            occurrences: 1,
            firstSeenAt: now,
            lastSeenAt: now,
            status: 'open' as const,
          },
        ];
      }
    }

    // Keep legacy numeric fields readable; new submissions update facts, not a fabricated probability.
    const masteryByNode = state.masteryByNode.map((mastery) => {
      if (mastery.learnerId !== input.learnerId || mastery.nodeId !== input.nodeId) return mastery;
      return {
        ...mastery,
        evidenceIds: [...mastery.evidenceIds.slice(-7), evidenceRecord.id],
        lastReviewedAt: now,
      };
    });
    const knownNode = masteryByNode.some(
      (mastery) => mastery.learnerId === input.learnerId && mastery.nodeId === input.nodeId,
    );
    const fullMastery = knownNode
      ? masteryByNode
      : [
          ...masteryByNode,
          {
            learnerId: input.learnerId,
            nodeId: input.nodeId,
            level: 0 as MasteryState['level'],
            confidence: 0,
            evidenceIds: [evidenceRecord.id],
            lastReviewedAt: now,
          },
        ];

    let remediationTasks = state.remediationTasks;
    if (input.misconceptionId && !input.correct && !remediationTasks.some((task) => task.learnerId === input.learnerId && task.misconceptionId === input.misconceptionId && task.status !== 'done')) {
      remediationTasks = [...remediationTasks, { id: `rem-${input.learnerId}-${input.misconceptionId}-${now}`, learnerId: input.learnerId, unitId: `tu-${input.nodeId}`, misconceptionId: input.misconceptionId, status: 'pending', createdAt: now, reason: input.evidence?.decisionReason ?? '作答显示此处需要巩固。' }];
    }
    const next: PersistedProgress = {
      learnerId: input.learnerId,
      answerRecords: [...state.answerRecords, answerRecord],
      evidenceRecords: [...state.evidenceRecords, evidenceRecord],
      misconceptionRecords,
      remediationTasks,
      masteryByNode: fullMastery,
      taskExposures: state.taskExposures,
    };
    if (deriveLearningStatus(input.nodeId, input.learnerId, next.evidenceRecords).status === 'verified') {
      next.remediationTasks = next.remediationTasks.map((task) => task.learnerId === input.learnerId && task.unitId === `tu-${input.nodeId}` ? { ...task, status: 'done' } : task);
      next.misconceptionRecords = next.misconceptionRecords.map((record) => record.learnerId === input.learnerId && record.nodeId === input.nodeId ? { ...record, status: 'remediated' } : record);
    }
    if (!persistProgress(next)) { set({ storageError: '记录未保存，保留当前答案后重试。' }); return false; }
    set({ ...next, storageError: null });
    return true;
  },

  completeRemediationTask: (taskId) => {
    const next: PersistedProgress = {
      ...get(),
      remediationTasks: get().remediationTasks.map((task) =>
        task.id === taskId ? { ...task, status: 'done' as const } : task,
      ),
    };
    if (!persistProgress(next)) { set({ storageError: '记录未保存，请重试。' }); return; }
    set({ ...next, storageError: null });
  },

  reset: () => {
    removeDomain(DOMAIN_KEYS.progress);
    set({
      learnerId: DEMO_HISTORY.profiles[0].id,
      answerRecords: [...DEMO_HISTORY.answerRecords],
      evidenceRecords: [...DEMO_HISTORY.evidenceRecords],
      misconceptionRecords: [...DEMO_HISTORY.misconceptionRecords],
      remediationTasks: [...DEMO_HISTORY.remediationTasks],
      masteryByNode: [...DEMO_HISTORY.masteryByNode],
      taskExposures: [],
      storageError: null,
    });
  },
}));

export type LearningStatus = 'unverified' | 'needs-work' | 'assisted' | 'passed';
export const LEARNING_STATUS_LABELS: Record<LearningStatus, string> = { unverified: '尚未验证', 'needs-work': '需要巩固', assisted: '辅助下完成', passed: '本次独立验证通过' };

export function learningStatusFromEvidence(records: EvidenceRecord[], nodeId: string, learnerId: string) {
  const derived = deriveLearningStatus(nodeId, learnerId, records);
  // Keep the existing TCP/record UI contract until those views adopt V11 labels.
  const status: LearningStatus = derived.status === 'verified' ? 'passed' : derived.status === 'needs-reinforcement' ? 'needs-work' : derived.status === 'needs-verification' ? 'assisted' : 'unverified';
  return { ...derived, status, label: LEARNING_STATUS_LABELS[status] };
}

export function getLearningStatus(nodeId: string, learnerId = useProgressStore.getState().learnerId) {
  return learningStatusFromEvidence(useProgressStore.getState().evidenceRecords, nodeId, learnerId);
}

export function masteryOfNode(nodeId: string): MasteryState | undefined {
  const state = useProgressStore.getState();
  return state.masteryByNode.find(
    (mastery) => mastery.learnerId === state.learnerId && mastery.nodeId === nodeId,
  );
}
