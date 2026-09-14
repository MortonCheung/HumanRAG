import type { EvidenceRecord } from '../../data/v6/schemas/progressSchema';
import { TCP_NODE_ID, TCP_VERSION } from '../../data/v6/handcrafted/tcpLesson';

export type LearningStatus = 'unknown' | 'learning' | 'needs-reinforcement' | 'needs-verification' | 'verified';

export const LEARNING_STATUS_LABELS: Record<LearningStatus, string> = {
  unknown: '尚未开始',
  learning: '正在学习',
  'needs-reinforcement': '需要巩固',
  'needs-verification': '待独立验证',
  verified: '本次独立验证通过',
};

export interface LearningStatusResult {
  status: LearningStatus;
  label: string;
  reason: string;
  evidenceCount: number;
  updatedAt?: string;
}

/** Legacy/demo summaries remain readable, but do not prove a live learning action. */
export function isRecordedEvidence(entry: EvidenceRecord): boolean {
  return Boolean(entry.eventId && entry.questionId && entry.contentVersion && entry.snapshot
    && Number.isFinite(Date.parse(entry.createdAt)));
}

/**
 * Product verification contract, not a scientific claim of lasting mastery:
 * a completed check containing at least two distinct, first-exposure,
 * unassisted tasks, all correct. Partial rounds cannot establish a pass.
 * TCP keeps its stricter current-version predict + observe pair.
 * Training (`practice`) never supplies a verification pass.
 */
export function deriveLearningStatus(nodeId: string, learnerId: string, evidence: readonly EvidenceRecord[]): LearningStatusResult {
  const seen = new Set<string>();
  const entries = evidence
    .filter((entry) => entry.nodeId === nodeId && entry.learnerId === learnerId)
    .filter((entry) => {
      const key = entry.eventId ?? entry.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
  const recorded = entries.filter(isRecordedEvidence);
  const groups = new Map<string, EvidenceRecord[]>();
  for (const entry of entries) {
    if (entry.source !== 'independent-check' || !entry.sessionId || !entry.attempt) continue;
    const key = JSON.stringify([entry.sessionId, entry.attempt]);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  let lastPass = -1;
  for (const group of groups.values()) {
    if (!group.every((entry) => isRecordedEvidence(entry) && entry.result === 'correct' && entry.assistance === 'independent' && entry.firstExposure === true)) continue;
    const questions = new Set(group.map((entry) => entry.questionId));
    const completedQuestions = group.at(-1)?.verificationQuestionIds;
    const passed = nodeId === TCP_NODE_ID
      ? group.length === 2 && questions.size === 2 && group.every((entry) => entry.contentVersion === TCP_VERSION)
        && group.some((entry) => entry.taskRole === 'predict') && group.some((entry) => entry.taskRole === 'observe')
      : questions.size >= 2 && questions.size === group.length
        && new Set(group.map((entry) => entry.contentVersion)).size === 1
        && completedQuestions !== undefined && completedQuestions.length === questions.size
        && new Set(completedQuestions).size === completedQuestions.length
        && completedQuestions.every((id) => questions.has(id));
    if (passed) lastPass = Math.max(lastPass, ...group.map((entry) => recorded.indexOf(entry)));
  }
  const lastFailure = recorded.reduce((last, entry, index) => entry.result !== 'correct' ? index : last, -1);
  const lastAssisted = recorded.reduce((last, entry, index) => entry.result === 'correct'
    && (entry.assistance === 'hint' || entry.assistance === 'demonstration' || entry.firstExposure === false) ? index : last, -1);
  let status: LearningStatus = recorded.length ? 'learning' : 'unknown';
  let reason = recorded.length
    ? '已有学习或训练作答，尚未完成独立验证。'
    : entries.length ? '旧证据缺少作答快照、内容版本或来源，不能据此确认当前状态。' : '还没有学习记录。';

  if (lastAssisted > Math.max(lastFailure, lastPass)) {
    status = 'needs-verification';
    reason = recorded[lastAssisted].firstExposure === false
      ? '正确作答来自已曝光任务，需要用新任务独立验证。'
      : '在帮助下完成，需要用新任务独立验证。';
  } else if (lastFailure > lastPass) {
    status = 'needs-reinforcement';
    reason = '最近的作答尚未通过，需要先巩固再独立验证。';
  } else if (lastPass >= 0) {
    status = 'verified';
    reason = nodeId === TCP_NODE_ID
      ? '本轮预测与观察两项新任务均无提示通过；不代表长期掌握。'
      : '本轮全部新任务均无提示通过；不代表长期掌握。';
  } else if (recorded.some((entry) => entry.source === 'independent-check')) {
    status = 'needs-verification';
    reason = '本轮还缺少完整、首次且无提示的独立验证证据。';
  }
  return { status, label: LEARNING_STATUS_LABELS[status], reason, evidenceCount: entries.length, updatedAt: recorded.at(-1)?.createdAt };
}
