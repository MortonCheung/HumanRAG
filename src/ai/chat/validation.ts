import { z } from 'zod';
import type { ChatRequest } from './contracts';
import { AI_BUDGETS } from './contracts';

const shortText = (max: number) => z.string().trim().min(1).max(max);
const nullableRate = z.number().min(0).max(1).nullable();
const messageSchema = z.object({ role: z.enum(['user', 'assistant']), content: shortText(5_000) }).strict();
const baseContextSchema = z.object({
  dataMode: z.literal('demo'),
  profile: z.object({ name: shortText(20), major: shortText(40), identity: shortText(20), goal: shortText(60) }).strict(),
  overall: z.object({
    accuracy: nullableRate, answered: z.number().int().nonnegative(), activeDays: z.number().int().nonnegative(),
    longestStreak: z.number().int().nonnegative(), touchedPoints: z.number().int().nonnegative(), openMisconceptions: z.number().int().nonnegative(),
  }).strict(),
  weakPoints: z.array(shortText(160)).max(3),
  recommendation: z.object({ pointName: shortText(160), reason: shortText(500).optional() }).strict().optional(),
}).strict();

const mistakesSchema = z.object({
  type: z.literal('mistakes'),
  misconceptions: z.array(z.object({ name: shortText(200), nodeName: shortText(160), occurrences: z.number().int().positive(), lastSeenAt: shortText(80) }).strict()).max(5),
  recentWrongAnswers: z.array(z.object({ nodeName: shortText(160), stem: shortText(1_200), createdAt: shortText(80) }).strict()).max(3),
}).strict();
const activitySchema = z.object({
  type: z.literal('activity'), activeDays: z.number().int().nonnegative(), longestStreak: z.number().int().nonnegative(),
  recent14Days: z.object({ answered: z.number().int().nonnegative(), correct: z.number().int().nonnegative(), activeDays: z.number().int().min(0).max(14), accuracy: nullableRate }).strict(),
  activeDates: z.array(z.object({ date: shortText(20), count: z.number().int().positive(), accuracy: nullableRate }).strict()).max(14),
}).strict();
const branchesSchema = z.object({
  type: z.literal('branches'),
  branches: z.array(z.object({ name: z.enum(['408', 'AI', '游戏开发', '前端']), answered: z.number().int().nonnegative(), touchedPoints: z.number().int().nonnegative(), accuracy: nullableRate }).strict()).length(4),
}).strict();
const recommendationSchema = z.object({ type: z.literal('recommendation'), pointName: shortText(160), pointId: shortText(160), reasons: z.array(shortText(500)).max(3) }).strict();
const recentLearningSchema = z.object({ type: z.literal('recentLearning'), items: z.array(z.object({ date: shortText(80), nodeName: shortText(160), correct: z.boolean() }).strict()).max(5) }).strict();
const contextBlockSchema = z.discriminatedUnion('type', [mistakesSchema, activitySchema, branchesSchema, recommendationSchema, recentLearningSchema]);

const routeSchema = z.object({
  intent: z.enum(['general', 'learning-overview', 'weakness', 'activity', 'planning', 'branch-analysis', 'recent-learning']),
  blocks: z.array(z.enum(['mistakes', 'activity', 'branches', 'recommendation', 'recentLearning'])).max(2),
  flags: z.object({ asksEvaluation: z.boolean() }).strict(),
}).strict();

const beforeQuestionSchema = z.object({
  questionId: shortText(160), stem: shortText(1_200), state: z.literal('before-submit'), answerPolicy: z.literal('hint-only'),
}).strict();
const afterQuestionSchema = z.object({
  questionId: shortText(160), stem: shortText(1_200), state: z.literal('after-submit'), answerPolicy: z.literal('review'),
  userAnswer: shortText(1_000), expectedAnswer: shortText(1_000), explanation: shortText(1_500),
}).strict();
const pageContextSchema = z.object({
  key: shortText(240), route: shortText(500), pageType: z.enum(['universe', 'library', 'tree', 'study', 'teach', 'practice', 'progress']), title: shortText(200),
  treeId: shortText(160).optional(),
  selectedNode: z.object({ id: shortText(160), name: shortText(160), description: shortText(1_200).optional() }).strict().optional(),
  teaching: z.object({ unitId: shortText(160), stepId: shortText(160), stepTitle: shortText(200), stepKind: shortText(80) }).strict().optional(),
  activeQuestion: z.discriminatedUnion('state', [beforeQuestionSchema, afterQuestionSchema]).optional(),
}).strict();
const explicitContextSchema = z.union([
  z.object({ type: z.literal('knowledge'), nodeId: shortText(160), title: shortText(200), description: shortText(1_200).optional() }).strict(),
  z.object({ type: z.literal('content'), nodeId: shortText(160).optional(), title: shortText(200), content: shortText(1_200) }).strict(),
  z.object({ type: z.literal('question'), questionId: shortText(160), title: shortText(200), stem: shortText(1_200), answerPolicy: z.literal('hint-only') }).strict(),
  z.object({
    type: z.literal('question'), questionId: shortText(160), title: shortText(200), stem: shortText(1_200), answerPolicy: z.literal('review'),
    userAnswer: shortText(1_000).optional(), expectedAnswer: shortText(1_000).optional(), explanation: shortText(1_500).optional(), misconception: shortText(800).optional(),
  }).strict(),
]);

const tutorSchema = z.object({
  mode: z.literal('tutor'), message: shortText(AI_BUDGETS.tutor.userChars),
  history: z.array(messageSchema).max(AI_BUDGETS.tutor.historyPairs * 2), baseContext: baseContextSchema,
  contextBlocks: z.array(contextBlockSchema).max(2), routing: routeSchema,
}).strict();
const picoSchema = z.object({
  mode: z.literal('pico'), message: shortText(AI_BUDGETS.pico.userChars),
  history: z.array(messageSchema).max(AI_BUDGETS.pico.historyPairs * 2), pageContext: pageContextSchema,
  explicitContext: explicitContextSchema.optional(),
}).strict();
const insightSchema = z.object({
  mode: z.literal('insight'), baseContext: baseContextSchema, contextBlocks: z.array(contextBlockSchema).max(2),
}).strict();
const chatRequestSchema = z.discriminatedUnion('mode', [picoSchema, tutorSchema, insightSchema]);

export function validateChatRequest(value: unknown): { ok: true; value: ChatRequest } | { ok: false; error: 'INVALID_REQUEST' } {
  const result = chatRequestSchema.safeParse(value);
  return result.success ? { ok: true, value: result.data as ChatRequest } : { ok: false, error: 'INVALID_REQUEST' };
}
