import { create } from 'zustand';
import type {
  AnswerRecord,
  EvidenceRecord,
  MasteryState,
  MisconceptionRecord,
  RemediationTask,
} from '../data/v6/schemas/progressSchema';
import {
  DEMO_HISTORY,
  historyForLearner,
} from '../data/v6/generators/generateDemoHistory';
import { MISCONCEPTIONS } from '../data/v6/catalogs/misconceptionCatalog';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';

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
}

interface ProgressState extends PersistedProgress {
  switchLearner: (learnerId: string) => void;
  recordAnswer: (input: {
    learnerId: string;
    questionId: string;
    nodeId: string;
    selected: string;
    correct: boolean;
    source: EvidenceRecord['source'];
    misconceptionId?: string;
  }) => void;
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

function persistProgress(state: PersistedProgress): void {
  saveDomain(DOMAIN_KEYS.progress, state);
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  learnerId: persisted?.learnerId ?? DEMO_HISTORY.profiles[0].id,
  answerRecords: persisted?.answerRecords ?? [...DEMO_HISTORY.answerRecords],
  evidenceRecords: persisted?.evidenceRecords ?? [...DEMO_HISTORY.evidenceRecords],
  misconceptionRecords: persisted?.misconceptionRecords ?? [...DEMO_HISTORY.misconceptionRecords],
  remediationTasks: persisted?.remediationTasks ?? [...DEMO_HISTORY.remediationTasks],
  masteryByNode: persisted?.masteryByNode ?? [...DEMO_HISTORY.masteryByNode],

  switchLearner: (learnerId) => {
    const history = historyForLearner(learnerId);
    const next: PersistedProgress = {
      learnerId,
      answerRecords: history.answerRecords,
      evidenceRecords: history.evidenceRecords,
      misconceptionRecords: history.misconceptionRecords,
      remediationTasks: history.remediationTasks,
      masteryByNode: history.masteryByNode,
    };
    persistProgress(next);
    set(next);
  },

  recordAnswer: (input) => {
    const state = get();
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
    };

    let misconceptionRecords = state.misconceptionRecords;
    if (input.misconceptionId) {
      const existing = state.misconceptionRecords.find(
        (record) => record.learnerId === input.learnerId && record.misconceptionId === input.misconceptionId,
      );
      const entry = MISCONCEPTIONS.find((candidate) => candidate.id === input.misconceptionId);
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

    // 掌握度：正确提升置信，错误下降；等级按置信阈值重算。按 learnerId + nodeId 隔离。
    const masteryByNode = state.masteryByNode.map((mastery) => {
      if (mastery.learnerId !== input.learnerId || mastery.nodeId !== input.nodeId) return mastery;
      const confidence = Math.min(1, Math.max(0, mastery.confidence + (input.correct ? 0.12 : -0.18)));
      const level = confidence < 0.2 ? 0 : confidence < 0.4 ? 1 : confidence < 0.6 ? 2 : confidence < 0.85 ? 3 : 4;
      return {
        ...mastery,
        confidence: Number(confidence.toFixed(2)),
        level: level as MasteryState['level'],
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
            level: (input.correct ? 2 : 1) as MasteryState['level'],
            confidence: input.correct ? 0.55 : 0.35,
            evidenceIds: [evidenceRecord.id],
            lastReviewedAt: now,
          },
        ];

    const next: PersistedProgress = {
      learnerId: input.learnerId,
      answerRecords: [...state.answerRecords, answerRecord],
      evidenceRecords: [...state.evidenceRecords, evidenceRecord],
      misconceptionRecords,
      remediationTasks: state.remediationTasks,
      masteryByNode: fullMastery,
    };
    persistProgress(next);
    set(next);
  },

  completeRemediationTask: (taskId) => {
    const next: PersistedProgress = {
      ...get(),
      remediationTasks: get().remediationTasks.map((task) =>
        task.id === taskId ? { ...task, status: 'done' as const } : task,
      ),
    };
    persistProgress(next);
    set(next);
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
    });
  },
}));

export function masteryOfNode(nodeId: string): MasteryState | undefined {
  const state = useProgressStore.getState();
  return state.masteryByNode.find(
    (mastery) => mastery.learnerId === state.learnerId && mastery.nodeId === nodeId,
  );
}
