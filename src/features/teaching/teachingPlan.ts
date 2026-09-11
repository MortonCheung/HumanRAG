import type { BranchId } from '../../graph/types';
import { contentRepository } from '../../services/content/ContentRepository';
import { MISCONCEPTIONS } from '../../data/v6/catalogs/misconceptionCatalog';
import { useProgressStore } from '../../store/progressStore';
import type { RemediationTask } from '../../data/v6/schemas/progressSchema';
import { getLearningRecommendation } from '../../ai/learningRecommendation';
import { deriveLearningStatus, isRecordedEvidence } from '../progress/learningStatus';

/** Teach is a presentation adapter for the same recommendation used elsewhere. */

export interface TeachingRecommendation {
  unitId: string;
  nodeId: string;
  nodeName: string;
  branchId: BranchId;
  reason: string;
  estimatedMinutes: number;
}

function nodeOf(nodeId: string) {
  return contentRepository.getNode(nodeId);
}

export function recommendNextTeaching(learnerId: string): TeachingRecommendation | null {
  const recommendation = getLearningRecommendation(learnerId);
  const node = recommendation ? nodeOf(recommendation.nodeId) : undefined;
  const unit = node ? contentRepository.getTeachingUnitForNode(node.id) : undefined;
  if (!recommendation || !node || !unit) return null;
  return { unitId: unit.id, nodeId: node.id, nodeName: node.name, branchId: node.branchId, reason: recommendation.reasons.join(' '), estimatedMinutes: unit.estimatedMinutes };
}

export interface ReviewItem {
  id: string;
  nodeId: string;
  nodeName: string;
  unitId: string;
  why: string;
}

export function pendingReviews(learnerId: string): ReviewItem[] {
  const progress = useProgressStore.getState();
  const tasks: RemediationTask[] = progress.remediationTasks.filter(
    (task) => task.learnerId === learnerId && task.status !== 'done'
      && progress.evidenceRecords.some((entry) => entry.learnerId === learnerId && entry.nodeId === task.unitId.replace(/^tu-/, '') && entry.misconceptionId === task.misconceptionId && entry.result !== 'correct' && isRecordedEvidence(entry))
      && deriveLearningStatus(task.unitId.replace(/^tu-/, ''), learnerId, progress.evidenceRecords).status !== 'verified',
  );
  return tasks.map((task) => {
    const node = nodeOf(task.unitId.replace(/^tu-/, ''));
    const misconception = MISCONCEPTIONS.find((entry) => entry.id === task.misconceptionId);
    return {
      id: task.id,
      nodeId: node?.id ?? '',
      nodeName: node?.name ?? '未知节点',
      unitId: task.unitId,
      why: misconception ? `误区「${misconception.name}」待复教` : task.reason,
    };
  });
}
