import type { EvidenceRecord } from '../../data/v6/schemas/progressSchema';
import { deriveLearningStatus } from '../../features/progress/learningStatus';
import { useProgressStore } from '../../store/progressStore';

export type LearningState = 'unknown' | 'learning' | 'needs-reinforcement' | 'needs-verification' | 'verified';

export const LEARNING_STATE_LABELS: Record<LearningState, string> = {
  unknown: '尚未开始',
  learning: '学习中',
  'needs-reinforcement': '需要巩固',
  'needs-verification': '待测验',
  verified: '已掌握',
};

/**
 * The only domain selector for a point's learning state. Views may choose their
 * own wording, but must not reinterpret evidence or invent a separate status.
 */
export function deriveLearningStateFromEvidence(
  pointId: string,
  learnerId: string,
  evidence: readonly EvidenceRecord[],
): LearningState {
  return deriveLearningStatus(pointId, learnerId, evidence).status;
}

export function deriveLearningState(pointId: string, learnerId: string): LearningState {
  return deriveLearningStateFromEvidence(pointId, learnerId, useProgressStore.getState().evidenceRecords);
}

