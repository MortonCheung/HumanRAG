import type { BranchId } from '../../graph/types';
import { contentRepository } from '../../services/content/ContentRepository';
import { MISCONCEPTIONS } from '../../data/v6/catalogs/misconceptionCatalog';
import { LEARNER_PROFILES } from '../../data/v6/catalogs/learnerProfileCatalog';
import { useProgressStore } from '../../store/progressStore';
import type { RemediationTask } from '../../data/v6/schemas/progressSchema';

/** 教学首页的推荐计算：全部来自演示学习记录，不编造理由。 */

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
  const progress = useProgressStore.getState();
  const profile = LEARNER_PROFILES.find((entry) => entry.id === learnerId);
  if (!profile) return null;

  // 优先：待复教任务（误区已定位）。
  const pendingTask = progress.remediationTasks.find(
    (task) => task.learnerId === learnerId && task.status !== 'done',
  );
  if (pendingTask) {
    const node = nodeOf(pendingTask.unitId.replace(/^tu-/, ''));
    const misconception = MISCONCEPTIONS.find((entry) => entry.id === pendingTask.misconceptionId);
    if (node) {
      const unit = contentRepository.getTeachingUnitForNode(node.id);
      return {
        unitId: unit?.id ?? pendingTask.unitId,
        nodeId: node.id,
        nodeName: node.name,
        branchId: node.branchId,
        reason: `${misconception?.name ?? '已定位误区'}在最近练习中反复出现，系统已安排补救教学：先复教误区对应的定义边界，再重新独立检查。`,
        estimatedMinutes: unit?.estimatedMinutes ?? 20,
      };
    }
  }

  // 其次：分支内掌握度最低的知识节点。
  const weakest = progress.masteryByNode
    .filter((mastery) => {
      const node = nodeOf(mastery.nodeId);
      return node?.branchId === profile.branchId && node.type === 'knowledge' && contentRepository.getTeachingUnitForNode(mastery.nodeId) !== undefined;
    })
    .sort((a, b) => a.confidence - b.confidence)[0];

  if (weakest) {
    const node = nodeOf(weakest.nodeId)!;
    const unit = contentRepository.getTeachingUnitForNode(node.id)!;
    const misconceptionRecord = progress.misconceptionRecords.find(
      (record) => record.learnerId === learnerId && record.nodeId === node.id && record.status === 'open',
    );
    const misconception = MISCONCEPTIONS.find((entry) => entry.id === misconceptionRecord?.misconceptionId);
    return {
      unitId: unit.id,
      nodeId: node.id,
      nodeName: node.name,
      branchId: node.branchId,
      reason: misconception
        ? `你在「${node.name}」上的掌握置信度为 ${(weakest.confidence * 100).toFixed(0)}%，且误区「${misconception.name}」尚未关闭。本节先诊断，再讲解，再练习。`
        : `「${node.name}」是当前目标路径上掌握置信度最低的知识点（${(weakest.confidence * 100).toFixed(0)}%）。本节从诊断开始，按结果决定起点。`,
      estimatedMinutes: unit.estimatedMinutes,
    };
  }
  return null;
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
    (task) => task.learnerId === learnerId && task.status !== 'done',
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
