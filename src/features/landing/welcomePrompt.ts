import type { EvidenceRecord, RemediationTask } from '../../data/v6/schemas/progressSchema';
import { deriveLearningStatus, isRecordedEvidence } from '../progress/learningStatus';
import type { LearningRecommendation } from '../progress/learningRecommendation';

const BASE = [
  ['今天，', '从哪开始？'],
  ['今天，', '学点什么？'],
  ['准备好了，', '就开始。'],
] as const;

/** Pure copy selection. The caller captures it once for an entry lifecycle. */
export function welcomePrompt(input: {
  learnerId: string;
  evidence: readonly EvidenceRecord[];
  tasks: readonly RemediationTask[];
  recommendation?: LearningRecommendation | null;
  variant?: number;
}) {
  const own = input.evidence.filter((entry) => entry.learnerId === input.learnerId && isRecordedEvidence(entry));
  const pending = input.tasks.some((task) => task.learnerId === input.learnerId && task.status !== 'done'
    && own.some((entry) => entry.result !== 'correct' && entry.misconceptionId === task.misconceptionId
      && task.unitId === `tu-${entry.nodeId}` && deriveLearningStatus(entry.nodeId, input.learnerId, own).status !== 'verified'));
  if (pending) return { kind: 'remediation', lines: ['还有个问题，', '没有解决。'] } as const;
  if (own.length) return { kind: 'recent', lines: ['上次，', '停在这里。'] } as const;
  if (input.recommendation) return { kind: 'recommended', lines: ['下一步，', '准备好了。'] } as const;
  const index = Math.abs(Math.trunc(input.variant ?? 0)) % BASE.length;
  return { kind: 'base', lines: BASE[Number.isFinite(index) ? index : 0] } as const;
}
