import { z } from 'zod';
import type { BranchId } from '../../../graph/types';

export const QuestionTypeSchema = z.enum([
  'single-choice',
  'multiple-choice',
  'true-false',
  'fill-blank',
  'ordering',
  'code-trace',
  'short-answer',
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const QuestionAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choice'), optionIds: z.array(z.string().min(1)).min(1) }),
  z.object({ kind: z.literal('ordering'), optionIds: z.array(z.string().min(1)).min(2) }),
  z.object({ kind: z.literal('boolean'), value: z.boolean() }),
  z.object({ kind: z.literal('text'), value: z.string().min(1) }),
]);
export type QuestionAnswer = z.infer<typeof QuestionAnswerSchema>;

const OPTION_REQUIRED_TYPES = new Set<QuestionType>(['single-choice', 'multiple-choice', 'ordering', 'code-trace']);

export const QuestionSchema = z
  .object({
    id: z.string().min(1),
    blueprintId: z.string().min(1),
    variantSeed: z.number().int().nonnegative(),
    nodeIds: z.array(z.string().min(1)).min(1),
    type: QuestionTypeSchema,
    difficulty: z.number().int().min(1).max(5),
    stem: z.string().min(1),
    options: z.array(QuestionOptionSchema).optional(),
    answer: QuestionAnswerSchema,
    explanation: z.string().min(1),
    misconceptionByAnswer: z.record(z.string(), z.string().min(1)),
    remediationUnitId: z.string().optional(),
    sourceLabel: z.string().min(1),
  })
  .refine((question) => !OPTION_REQUIRED_TYPES.has(question.type) || (question.options?.length ?? 0) >= 2, {
    message: '选择题必须提供至少两个选项',
  })
  .refine((question) => {
    if (!question.options) return true;
    const ids = question.options.map((option) => option.id);
    return new Set(ids).size === ids.length;
  }, { message: '选项 id 必须唯一' })
  .refine((question) => {
    const answer = question.answer;
    if (answer.kind !== 'choice' && answer.kind !== 'ordering') return true;
    const ids = new Set((question.options ?? []).map((option) => option.id));
    return answer.optionIds.every((id) => ids.has(id));
  }, { message: '答案必须指向存在的选项' });
export type Question = z.infer<typeof QuestionSchema>;

/** materialize 阶段的中间产物，不是持久化数据。 */
export interface QuestionMaterial {
  stem: string;
  options?: Array<{ id: string; text: string }>;
  answer: QuestionAnswer;
  explanation: string;
  misconceptionByAnswer?: Record<string, string>;
}

export interface QuestionBlueprint {
  id: string;
  branchId: BranchId | 'university';
  nodeIds: string[];
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sourceLabel: string;
  remediationUnitId?: string;
  materialize(variantSeed: number): QuestionMaterial;
}

export const VARIANT_COUNT_PER_BLUEPRINT = 8;

export const MockPaperSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  branchId: z.enum(['408', 'ai', 'game', 'frontend']),
  questionIds: z.array(z.string().min(1)).length(40),
  estimatedMinutes: z.number().int().min(20).max(240),
});
export type MockPaper = z.infer<typeof MockPaperSchema>;
