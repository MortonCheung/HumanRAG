import type {
  AnswerRecord,
  DemoHistory,
  EvidenceRecord,
  LearnerProfile,
  MasteryState,
  MisconceptionRecord,
  RemediationTask,
} from '../schemas/progressSchema';
import { SeededRandom } from './seededRandom';
import { LEARNER_PROFILES, DEFAULT_LEARNER } from '../catalogs/learnerProfileCatalog';
import { MISCONCEPTIONS } from '../catalogs/misconceptionCatalog';
import { listQuestionIdsByBranch, getQuestion } from './generateQuestionVariants';
import { TEACHING_UNITS_BY_NODE_ID } from './generateTeachingUnit';
import { knowledgeGraph } from '../../knowledgeGraph';
import type { BranchId } from '../../../graph/types';

/**
 * 演示学习记录生成器（全部为静态演示数据，界面必须标记「演示数据」）：
 * - 24 个画像，默认画像含 90 天学习时间线。
 * - 1,200 条答题记录、380 条教学证据、96 条误区记录、28 个待复教任务。
 * 所有时间戳固定在 2026-06-01 至 2026-08-29 的 90 天窗口内，确定性生成。
 */

const TIMELINE_START = Date.UTC(2026, 5, 1); // 2026-06-01
const TIMELINE_DAYS = 90;

function isoDate(dayOffset: number, hour = 10): string {
  return new Date(TIMELINE_START + dayOffset * 86_400_000 + hour * 3_600_000).toISOString();
}

const TOTAL_ANSWERS = 1_200;
const TOTAL_EVIDENCE = 380;
const TOTAL_MISCONCEPTION_RECORDS = 96;
const TOTAL_REMEDIATION_TASKS = 28;

/** 各画像的分支题目池（只取 id）。 */
const branchPools: Record<BranchId, string[]> = {
  '408': listQuestionIdsByBranch('408'),
  ai: listQuestionIdsByBranch('ai'),
  game: listQuestionIdsByBranch('game'),
  frontend: listQuestionIdsByBranch('frontend'),
};

function pickSelected(question: ReturnType<typeof getQuestion>, rng: SeededRandom, correct: boolean): string {
  if (!question) return '';
  const answer = question.answer;
  if (answer.kind === 'choice' || answer.kind === 'ordering') {
    const optionIds = (question.options ?? []).map((option) => option.id);
    if (correct) {
      return answer.kind === 'choice' ? answer.optionIds.join(',') : answer.optionIds.join(',');
    }
    const wrongIds = optionIds.filter((id) => !answer.optionIds.includes(id));
    return wrongIds.length > 0 ? rng.pick(wrongIds) : optionIds[0] ?? '';
  }
  if (answer.kind === 'boolean') {
    return correct === answer.value ? 'true' : 'false';
  }
  return correct ? answer.value : `（作答偏离：${answer.value.slice(0, 8)}…）`;
}

function nodeIdOfQuestion(questionId: string): string {
  const question = getQuestion(questionId);
  return question?.nodeIds[0] ?? knowledgeGraph.nodes[0].id;
}

function buildAnswerRecords(): AnswerRecord[] {
  const records: AnswerRecord[] = [];
  // 默认画像 128 条，其余画像均分剩余额度。
  const defaultCount = 128;
  const restCount = Math.floor((TOTAL_ANSWERS - defaultCount) / (LEARNER_PROFILES.length - 1));
  let remainder = TOTAL_ANSWERS - defaultCount - restCount * (LEARNER_PROFILES.length - 1);

  let sequence = 0;
  for (const profile of LEARNER_PROFILES) {
    const count = profile.isDefault
      ? defaultCount
      : restCount + (remainder > 0 ? ((remainder -= 1), 1) : 0);
    const rng = new SeededRandom(`history-${profile.id}`);
    const pool = branchPools[profile.branchId];
    for (let index = 0; index < count; index += 1) {
      const questionId = pool[(sequence * 37 + index * 101 + profile.id.length * 13) % pool.length];
      const question = getQuestion(questionId);
      const correct = rng.float() < 0.62;
      sequence += 1;
      records.push({
        id: `ans-${String(sequence).padStart(4, '0')}`,
        learnerId: profile.id,
        questionId,
        selected: pickSelected(question, rng, correct),
        correct,
        createdAt: isoDate(rng.int(0, TIMELINE_DAYS - 1), rng.int(8, 22)),
      });
    }
  }
  return records;
}

const ANSWER_RECORDS: AnswerRecord[] = buildAnswerRecords();

function buildEvidenceRecords(): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const sources = ['diagnostic', 'guided-practice', 'independent-check', 'practice'] as const;
  const results = ['correct', 'partial', 'incorrect'] as const;
  const defaultCount = 58;
  const restCount = Math.floor((TOTAL_EVIDENCE - defaultCount) / (LEARNER_PROFILES.length - 1));
  let remainder = TOTAL_EVIDENCE - defaultCount - restCount * (LEARNER_PROFILES.length - 1);

  let sequence = 0;
  for (const profile of LEARNER_PROFILES) {
    const count = profile.isDefault
      ? defaultCount
      : restCount + (remainder > 0 ? ((remainder -= 1), 1) : 0);
    const rng = new SeededRandom(`evidence-${profile.id}`);
    const pool = branchPools[profile.branchId];
    for (let index = 0; index < count; index += 1) {
      const questionId = pool[(sequence * 53 + index * 97 + 7) % pool.length];
      const roll = rng.float();
      const result = roll < 0.55 ? 'correct' : roll < 0.8 ? 'partial' : 'incorrect';
      const branchMisconceptions = MISCONCEPTIONS.filter((entry) => entry.branchId === profile.branchId);
      sequence += 1;
      records.push({
        id: `ev-${String(sequence).padStart(4, '0')}`,
        learnerId: profile.id,
        nodeId: nodeIdOfQuestion(questionId),
        source: sources[(index + profile.id.length) % sources.length],
        result,
        misconceptionId:
          result === 'incorrect' && branchMisconceptions.length > 0 && rng.bool()
            ? branchMisconceptions[index % branchMisconceptions.length].id
            : undefined,
        weight: Number(rng.float().toFixed(2)),
        createdAt: isoDate(rng.int(0, TIMELINE_DAYS - 1), rng.int(8, 22)),
      });
    }
  }
  return records;
}

const EVIDENCE_RECORDS: EvidenceRecord[] = buildEvidenceRecords();

function buildMisconceptionRecords(): MisconceptionRecord[] {
  const records: MisconceptionRecord[] = [];
  const defaultCount = 20;
  const restCount = Math.floor((TOTAL_MISCONCEPTION_RECORDS - defaultCount) / (LEARNER_PROFILES.length - 1));
  let remainder =
    TOTAL_MISCONCEPTION_RECORDS - defaultCount - restCount * (LEARNER_PROFILES.length - 1);

  let sequence = 0;
  for (const profile of LEARNER_PROFILES) {
    const count = profile.isDefault
      ? defaultCount
      : restCount + (remainder > 0 ? ((remainder -= 1), 1) : 0);
    const rng = new SeededRandom(`misconception-${profile.id}`);
    const pool = MISCONCEPTIONS.filter((entry) => entry.branchId === profile.branchId);
    for (let index = 0; index < count && index < pool.length; index += 1) {
      const entry = pool[(index + profile.id.length) % pool.length];
      const statusRoll = rng.float();
      sequence += 1;
      records.push({
        id: `mis-${String(sequence).padStart(3, '0')}`,
        learnerId: profile.id,
        misconceptionId: entry.id,
        nodeId: entry.relatedNodeIds[0] ?? knowledgeGraph.nodes[0].id,
        occurrences: rng.int(1, 5),
        firstSeenAt: isoDate(rng.int(0, 50), 12),
        lastSeenAt: isoDate(rng.int(51, TIMELINE_DAYS - 1), 16),
        status: statusRoll < 0.5 ? 'open' : statusRoll < 0.85 ? 'remediated' : 'suppressed',
      });
    }
  }
  return records;
}

const MISCONCEPTION_RECORDS: MisconceptionRecord[] = buildMisconceptionRecords();

function buildRemediationTasks(): RemediationTask[] {
  const tasks: RemediationTask[] = [];
  const defaultCount = 8;
  const restCount = Math.floor((TOTAL_REMEDIATION_TASKS - defaultCount) / (LEARNER_PROFILES.length - 1));
  let remainder = TOTAL_REMEDIATION_TASKS - defaultCount - restCount * (LEARNER_PROFILES.length - 1);

  let sequence = 0;
  for (const profile of LEARNER_PROFILES) {
    const count = profile.isDefault
      ? defaultCount
      : restCount + (remainder > 0 ? ((remainder -= 1), 1) : 0);
    const rng = new SeededRandom(`remediation-${profile.id}`);
    const pool = MISCONCEPTIONS.filter((entry) => entry.branchId === profile.branchId);
    for (let index = 0; index < count && index < pool.length; index += 1) {
      const entry = pool[(index * 2 + profile.id.length) % pool.length];
      const nodeId = entry.relatedNodeIds[0] ?? knowledgeGraph.nodes[0].id;
      const unit = TEACHING_UNITS_BY_NODE_ID.get(nodeId);
      sequence += 1;
      tasks.push({
        id: `rem-${String(sequence).padStart(3, '0')}`,
        learnerId: profile.id,
        unitId: unit?.id ?? `tu-${nodeId}`,
        misconceptionId: entry.id,
        status: index === 0 ? 'in-progress' : 'pending',
        createdAt: isoDate(TIMELINE_DAYS - rng.int(1, 14), 9),
        reason: `独立检查中连续两次触发误区「${entry.name}」，需要复教。`,
      });
    }
  }
  return tasks;
}

const REMEDIATION_TASKS: RemediationTask[] = buildRemediationTasks();

function buildMasteryByNode(): MasteryState[] {
  // 默认画像 + 每个画像对应分支的全部教学节点掌握度。
  const states: MasteryState[] = [];
  for (const profile of LEARNER_PROFILES) {
    const rng = new SeededRandom(`mastery-${profile.id}`);
    const nodes = knowledgeGraph.nodes.filter((node) => node.branchId === profile.branchId);
    const evidenceForProfile = EVIDENCE_RECORDS.filter((record) => record.learnerId === profile.id);
    nodes.forEach((node, index) => {
      const evidenceIds = evidenceForProfile
        .filter((record) => record.nodeId === node.id)
        .slice(0, 4)
        .map((record) => record.id);
      const roll = rng.float();
      const level = roll < 0.12 ? 0 : roll < 0.34 ? 1 : roll < 0.62 ? 2 : roll < 0.88 ? 3 : 4;
      states.push({
        learnerId: profile.id,
        nodeId: node.id,
        level: level as MasteryState['level'],
        confidence: Number((0.3 + rng.float() * 0.7).toFixed(2)),
        evidenceIds,
        lastReviewedAt: isoDate(TIMELINE_DAYS - rng.int(0, 20), 15),
        nextReviewAt: isoDate(TIMELINE_DAYS + rng.int(1, 10), 10),
      });
    });
  }
  return states;
}

const MASTERY_BY_NODE: MasteryState[] = buildMasteryByNode();

export const DEMO_HISTORY: DemoHistory = {
  profiles: LEARNER_PROFILES,
  answerRecords: ANSWER_RECORDS,
  evidenceRecords: EVIDENCE_RECORDS,
  misconceptionRecords: MISCONCEPTION_RECORDS,
  remediationTasks: REMEDIATION_TASKS,
  masteryByNode: MASTERY_BY_NODE,
};

export function historyForLearner(learnerId: string): DemoHistory {
  return {
    profiles: LEARNER_PROFILES,
    answerRecords: ANSWER_RECORDS.filter((record) => record.learnerId === learnerId),
    evidenceRecords: EVIDENCE_RECORDS.filter((record) => record.learnerId === learnerId),
    misconceptionRecords: MISCONCEPTION_RECORDS.filter((record) => record.learnerId === learnerId),
    remediationTasks: REMEDIATION_TASKS.filter((task) => task.learnerId === learnerId),
    masteryByNode: MASTERY_BY_NODE.filter((state) => state.learnerId === learnerId),
  };
}

export function defaultLearnerHistory(): DemoHistory {
  return historyForLearner(DEFAULT_LEARNER.id);
}

export function learnerProfiles(): LearnerProfile[] {
  return LEARNER_PROFILES;
}

export const DEMO_HISTORY_COUNTS = {
  profiles: LEARNER_PROFILES.length,
  answerRecords: ANSWER_RECORDS.length,
  evidenceRecords: EVIDENCE_RECORDS.length,
  misconceptionRecords: MISCONCEPTION_RECORDS.length,
  remediationTasks: REMEDIATION_TASKS.length,
  masteryStates: MASTERY_BY_NODE.length,
};
