import type { Question } from '../../data/v6/schemas/questionSchema';
import { buildLearningDashboardSnapshot, type LearningDashboardInput } from '../../features/progress/learningDashboard';
import type { ContextBlock, ContextBlockId, LearnerContextBundle } from './contracts';

const BRANCH_NAMES = { '408': '408', ai: 'AI', game: '游戏开发', frontend: '前端' } as const;

export interface LearnerContextInput extends Omit<LearningDashboardInput, 'resolveQuestion'> {
  resolveQuestion: (questionId: string) => Pick<Question, 'nodeIds' | 'stem'> | undefined;
}

export function buildLearnerContextBundle(input: LearnerContextInput): LearnerContextBundle {
  const dashboard = buildLearningDashboardSnapshot(input);
  const ownAnswers = input.answerRecords
    .filter((record) => record.learnerId === input.learnerId)
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
  const recentDays = dashboard.activity.slice(-14);
  const recentAnswered = recentDays.reduce((sum, day) => sum + day.count, 0);
  const recentCorrect = recentDays.reduce((sum, day) => sum + day.correct, 0);
  const recommendation = dashboard.recommendation ? {
    type: 'recommendation' as const,
    pointName: dashboard.recommendation.pointName,
    pointId: dashboard.recommendation.pointId,
    reasons: dashboard.recommendation.reasons.slice(0, 3),
  } : undefined;

  return {
    base: {
      dataMode: 'demo',
      profile: {
        name: dashboard.profile.name,
        major: dashboard.profile.major,
        identity: dashboard.profile.identity,
        goal: dashboard.profile.goal,
      },
      overall: {
        accuracy: dashboard.totals.accuracy,
        answered: dashboard.totals.answered,
        activeDays: dashboard.totals.activeDays,
        longestStreak: dashboard.totals.longestStreak,
        touchedPoints: dashboard.totals.touchedPoints,
        openMisconceptions: dashboard.totals.openMisconceptions,
      },
      weakPoints: dashboard.attention.map((item) => item.name).slice(0, 3),
      recommendation: recommendation ? { pointName: recommendation.pointName, reason: recommendation.reasons[0] } : undefined,
    },
    blocks: {
      mistakes: {
        type: 'mistakes',
        misconceptions: dashboard.attention.slice(0, 5).map(({ name, nodeName, occurrences, lastSeenAt }) => ({ name, nodeName, occurrences, lastSeenAt })),
        recentWrongAnswers: ownAnswers
          .filter((answer) => !answer.correct)
          .flatMap((answer) => {
            const question = input.resolveQuestion(answer.questionId);
            const nodeId = question?.nodeIds[0];
            if (!question || !nodeId) return [];
            return [{
              nodeName: input.resolveNode(nodeId)?.name ?? nodeId,
              stem: question.stem,
              createdAt: answer.createdAt,
            }];
          })
          .slice(0, 3),
      },
      activity: {
        type: 'activity',
        activeDays: dashboard.totals.activeDays,
        longestStreak: dashboard.totals.longestStreak,
        recent14Days: {
          answered: recentAnswered,
          correct: recentCorrect,
          activeDays: recentDays.filter((day) => day.count > 0).length,
          accuracy: recentAnswered ? recentCorrect / recentAnswered : null,
        },
        activeDates: recentDays
          .filter((day) => day.count > 0)
          .map(({ date, count, accuracy }) => ({ date, count, accuracy })),
      },
      branches: {
        type: 'branches',
        branches: dashboard.branchStats.map(({ branchId, answered, touchedPoints, accuracy }) => ({
          name: BRANCH_NAMES[branchId], answered, touchedPoints, accuracy,
        })),
      },
      recommendation,
      recentLearning: {
        type: 'recentLearning',
        items: ownAnswers.flatMap((answer) => {
          const question = input.resolveQuestion(answer.questionId);
          const nodeId = question?.nodeIds[0];
          if (!nodeId) return [];
          return [{ date: answer.createdAt, nodeName: input.resolveNode(nodeId)?.name ?? nodeId, correct: answer.correct }];
        }).slice(0, 5),
      },
    },
  };
}

export function selectContextBlocks(bundle: LearnerContextBundle, ids: readonly ContextBlockId[]): ContextBlock[] {
  return ids.slice(0, 2).flatMap((id) => {
    const block = bundle.blocks[id];
    return block ? [block] : [];
  });
}
