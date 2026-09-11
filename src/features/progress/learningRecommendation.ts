import type { EvidenceRecord, RemediationTask } from '../../data/v6/schemas/progressSchema';
import { deriveLearningStatus, isRecordedEvidence, type LearningStatus } from './learningStatus';

export interface RecommendationNode {
  id: string;
  name: string;
  prerequisiteIds: readonly string[];
  unitId?: string;
}

export interface LearningRecommendation {
  nodeId: string;
  reasons: string[];
}

export interface RecommendationInput {
  learnerId: string;
  nodes: readonly RecommendationNode[];
  evidence: readonly EvidenceRecord[];
  remediationTasks?: readonly RemediationTask[];
}

const PRIORITY: Record<LearningStatus, number> = {
  'needs-reinforcement': 1, 'needs-verification': 2, learning: 3, unknown: 4, verified: 5,
};

/** One deterministic decision for the path, Inspector, welcome and practice planner. */
export function recommendLearningNode({ learnerId, nodes, evidence, remediationTasks = [] }: RecommendationInput): LearningRecommendation | null {
  const own = evidence.filter((entry) => entry.learnerId === learnerId && isRecordedEvidence(entry));
  const statuses = new Map(nodes.map((node) => [node.id, deriveLearningStatus(node.id, learnerId, evidence).status]));
  const statusOf = (id: string) => statuses.get(id) ?? deriveLearningStatus(id, learnerId, evidence).status;
  const hasRemediation = (node: RecommendationNode) => remediationTasks.some((task) => task.learnerId === learnerId
    && task.status !== 'done' && task.unitId === (node.unitId ?? `tu-${node.id}`)
    && own.some((entry) => entry.nodeId === node.id && entry.result !== 'correct' && entry.misconceptionId === task.misconceptionId));
  const candidates = nodes.filter((node) => statusOf(node.id) !== 'verified').slice().sort((a, b) =>
    (hasRemediation(a) ? 0 : PRIORITY[statusOf(a.id)]) - (hasRemediation(b) ? 0 : PRIORITY[statusOf(b.id)])
    || a.id.localeCompare(b.id));
  const requested = candidates[0];
  if (!requested) return null;

  // Follow known prerequisites within the selected scope; a cycle must not hang navigation.
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  let selected = requested;
  while (!visited.has(selected.id)) {
    visited.add(selected.id);
    const prerequisite = [...selected.prerequisiteIds].sort().find((id) => statusOf(id) !== 'verified' && byId.has(id) && !visited.has(id));
    if (!prerequisite) break;
    selected = byId.get(prerequisite)!;
  }
  const status = statusOf(selected.id);
  const reasons: string[] = [selected.id === requested.id ? '当前学习范围需要这个知识点。' : `先补「${requested.name}」所需的前置知识。`];
  const missing = selected.prerequisiteIds.filter((id) => statusOf(id) !== 'verified');
  if (missing.length) reasons.push('部分前置知识尚未验证，建议先确认基础。');
  else if (selected.prerequisiteIds.length) reasons.push('前置知识已有独立验证记录。');
  if (hasRemediation(selected)) reasons.push('已有与实际错答对应的补救任务。');
  if (status === 'needs-reinforcement') reasons.push('最近作答尚未通过，需要巩固。');
  if (status === 'needs-verification') reasons.push('还需要用新任务完成无提示验证。');
  if (status === 'learning') reasons.push('已经开始学习，还没有完成独立验证。');
  const misconceptions = new Map<string, Set<string>>();
  for (const entry of own) {
    if (entry.nodeId !== selected.id || entry.result === 'correct' || !entry.misconceptionId) continue;
    const events = misconceptions.get(entry.misconceptionId) ?? new Set<string>();
    events.add(entry.eventId!);
    misconceptions.set(entry.misconceptionId, events);
  }
  if ([...misconceptions.values()].some((events) => events.size >= 2)) reasons.push('同一误区在实际作答中出现了不止一次。');
  return { nodeId: selected.id, reasons };
}
