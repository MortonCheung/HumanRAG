import type { KnowledgeNode } from '../../graph/types';
import type { Question } from '../../data/v6/schemas/questionSchema';
import type {
  AnswerRecord,
  EvidenceRecord,
  LearnerProfile,
  MisconceptionRecord,
} from '../../data/v6/schemas/progressSchema';
import type { LearningRecommendation } from './learningRecommendation';
import type { BranchId } from '../../graph/types';

const DAY_MS = 86_400_000;
const ACTIVITY_DAYS = 90;
const BRANCHES: ReadonlyArray<{ branchId: BranchId; name: string }> = [
  { branchId: '408', name: '408' },
  { branchId: 'ai', name: 'AI' },
  { branchId: 'game', name: 'GAME' },
  { branchId: 'frontend', name: 'FRONTEND' },
];

export interface LearningActivityDay {
  date: string;
  count: number;
  correct: number;
  accuracy: number | null;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface LearningDashboardSnapshot {
  profile: LearnerProfile;
  totals: {
    answered: number;
    correct: number;
    incorrect: number;
    accuracy: number | null;
    activeDays: number;
    longestStreak: number;
    touchedPoints: number;
    openMisconceptions: number;
  };
  branchStats: Array<{
    branchId: BranchId;
    name: string;
    answered: number;
    correct: number;
    accuracy: number | null;
    touchedPoints: number;
  }>;
  activity: LearningActivityDay[];
  activityRange: { start: string; end: string };
  attention: Array<{
    id: string;
    misconceptionId: string;
    name: string;
    nodeId: string;
    nodeName: string;
    occurrences: number;
    lastSeenAt: string;
  }>;
  recommendation: (LearningRecommendation & { pointName: string }) | null;
  learningRecords: EvidenceRecord[];
}

export interface LearningDashboardInput {
  learnerId: string;
  profiles: readonly LearnerProfile[];
  answerRecords: readonly AnswerRecord[];
  evidenceRecords: readonly EvidenceRecord[];
  misconceptionRecords: readonly MisconceptionRecord[];
  resolveQuestion: (questionId: string) => Pick<Question, 'nodeIds'> | undefined;
  resolveNode: (nodeId: string) => Pick<KnowledgeNode, 'id' | 'name' | 'branchId'> | undefined;
  resolveMisconceptionName: (misconceptionId: string) => string | undefined;
  recommendation: LearningRecommendation | null;
  /** Used only when this learner has no answers, keeping this selector deterministic. */
  activityEndDate: string;
}

function dateKey(timestamp: string) {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(timestamp);
  return match?.[0];
}

function utcDay(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function shiftDate(date: string, amount: number) {
  return new Date(utcDay(date) + amount * DAY_MS).toISOString().slice(0, 10);
}

function activityLevel(count: number): LearningActivityDay['level'] {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function longestDateStreak(dates: readonly string[]) {
  const sorted = [...new Set(dates)].sort();
  let longest = 0;
  let current = 0;
  let previous = Number.NaN;
  for (const date of sorted) {
    const day = utcDay(date);
    current = day - previous === DAY_MS ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

/** One pure aggregation boundary for the whole dashboard. */
export function buildLearningDashboardSnapshot(input: LearningDashboardInput): LearningDashboardSnapshot {
  const profile = input.profiles.find((candidate) => candidate.id === input.learnerId);
  if (!profile) throw new Error(`Unknown learner profile: ${input.learnerId}`);

  // The learner is the only top-level scope. Profile branch/tree/goal never filter this ledger.
  const answers = input.answerRecords.filter((record) => record.learnerId === input.learnerId);
  const resolvedAnswers = answers.map((answer) => {
    const nodeId = input.resolveQuestion(answer.questionId)?.nodeIds[0];
    const node = nodeId ? input.resolveNode(nodeId) : undefined;
    return { answer, nodeId, node };
  });
  const correct = answers.filter((answer) => answer.correct).length;
  const activeDates = answers.flatMap((answer) => {
    const date = dateKey(answer.createdAt);
    return date ? [date] : [];
  });
  const touchedPoints = new Set(resolvedAnswers.flatMap(({ nodeId }) => nodeId ? [nodeId] : []));

  const branchStats = BRANCHES.map(({ branchId, name }) => {
    const branchAnswers = resolvedAnswers.filter(({ node }) => node?.branchId === branchId);
    const branchCorrect = branchAnswers.filter(({ answer }) => answer.correct).length;
    return {
      branchId,
      name,
      answered: branchAnswers.length,
      correct: branchCorrect,
      accuracy: branchAnswers.length ? branchCorrect / branchAnswers.length : null,
      touchedPoints: new Set(branchAnswers.flatMap(({ nodeId }) => nodeId ? [nodeId] : [])).size,
    };
  });

  const latestAnswerDate = [...activeDates].sort().at(-1);
  const fallbackDate = dateKey(input.activityEndDate);
  if (!latestAnswerDate && !fallbackDate) throw new Error(`Invalid activity end date: ${input.activityEndDate}`);
  const activityEnd = latestAnswerDate ?? fallbackDate!;
  const activityStart = shiftDate(activityEnd, -(ACTIVITY_DAYS - 1));
  const activityByDate = new Map<string, { count: number; correct: number }>();
  for (const answer of answers) {
    const date = dateKey(answer.createdAt);
    if (!date || date < activityStart || date > activityEnd) continue;
    const day = activityByDate.get(date) ?? { count: 0, correct: 0 };
    day.count += 1;
    if (answer.correct) day.correct += 1;
    activityByDate.set(date, day);
  }
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, index): LearningActivityDay => {
    const date = shiftDate(activityStart, index);
    const day = activityByDate.get(date) ?? { count: 0, correct: 0 };
    return {
      date,
      count: day.count,
      correct: day.correct,
      accuracy: day.count ? day.correct / day.count : null,
      level: activityLevel(day.count),
    };
  });

  const openMisconceptions = input.misconceptionRecords
    .filter((record) => record.learnerId === input.learnerId && record.status === 'open');
  const attention = openMisconceptions
    .slice()
    .sort((a, b) => b.occurrences - a.occurrences || b.lastSeenAt.localeCompare(a.lastSeenAt) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((record) => ({
      id: record.id,
      misconceptionId: record.misconceptionId,
      name: input.resolveMisconceptionName(record.misconceptionId) ?? '待巩固的判断',
      nodeId: record.nodeId,
      nodeName: input.resolveNode(record.nodeId)?.name ?? record.nodeId,
      occurrences: record.occurrences,
      lastSeenAt: record.lastSeenAt,
    }));

  const recommendation = input.recommendation ? {
    ...input.recommendation,
    pointName: input.resolveNode(input.recommendation.pointId)?.name ?? input.recommendation.pointId,
  } : null;
  const learningRecords = input.evidenceRecords
    .filter((record) => record.learnerId === input.learnerId && record.eventId && record.snapshot)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

  return {
    profile,
    totals: {
      answered: answers.length,
      correct,
      incorrect: answers.length - correct,
      accuracy: answers.length ? correct / answers.length : null,
      activeDays: new Set(activeDates).size,
      longestStreak: longestDateStreak(activeDates),
      touchedPoints: touchedPoints.size,
      openMisconceptions: openMisconceptions.length,
    },
    branchStats,
    activity,
    activityRange: { start: activityStart, end: activityEnd },
    attention,
    recommendation,
    learningRecords,
  };
}
