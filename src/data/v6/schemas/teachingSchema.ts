import { z } from 'zod';

export const TeachingStepKindSchema = z.enum([
  'objective',
  'diagnostic',
  'explanation',
  'worked-example',
  'guided-practice',
  'independent-check',
  'remediation',
  'summary',
]);
export type TeachingStepKind = z.infer<typeof TeachingStepKindSchema>;

export const TeachingContentBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('paragraph'), text: z.string().min(1) }),
  z.object({
    kind: z.literal('key-contrast'),
    title: z.string().min(1),
    items: z.array(z.object({ label: z.string().min(1), text: z.string().min(1) })).min(2),
  }),
  z.object({
    kind: z.literal('diagram'),
    caption: z.string().min(1),
    nodes: z.array(z.string().min(1)).min(2),
    edges: z.array(z.tuple([z.string(), z.string()])).min(1),
  }),
  z.object({
    kind: z.literal('example'),
    title: z.string().min(1),
    prompt: z.string().min(1),
    walkthrough: z.array(z.string().min(1)).min(1),
  }),
  z.object({ kind: z.literal('check-question'), questionId: z.string().min(1) }),
  z.object({ kind: z.literal('list'), title: z.string().min(1), items: z.array(z.string().min(1)).min(2) }),
]);
export type TeachingContentBlock = z.infer<typeof TeachingContentBlockSchema>;

export const TeachingNextRuleSchema = z.object({
  condition: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('diagnostic-below'), threshold: z.number().min(0).max(1) }),
    z.object({ kind: z.literal('misconception-detected'), misconceptionId: z.string().optional() }),
    z.object({ kind: z.literal('score-at-least'), threshold: z.number().min(0).max(1) }),
    z.object({ kind: z.literal('always') }),
  ]),
  next: z.string().min(1),
});
export type TeachingNextRule = z.infer<typeof TeachingNextRuleSchema>;

export const TeachingStepSchema = z
  .object({
    id: z.string().min(1),
    unitId: z.string().min(1),
    kind: TeachingStepKindSchema,
    title: z.string().min(1),
    bodyBlocks: z.array(TeachingContentBlockSchema).min(1),
    questionIds: z.array(z.string().min(1)).optional(),
    nextRules: z.array(TeachingNextRuleSchema).min(1),
  })
  .refine(
    (step) => {
      const conditions = step.nextRules.map((rule) => rule.condition.kind);
      const hasFallback = conditions.includes('always');
      if (!hasFallback) return false;
      // 「always」必须是最后一条，作为兜底出口。
      return conditions[conditions.length - 1] === 'always';
    },
    { message: '教学步骤必须以 always 规则结尾，保证存在下一步' },
  );
export type TeachingStep = z.infer<typeof TeachingStepSchema>;

export const TeachingUnitSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  prerequisiteNodeIds: z.array(z.string().min(1)),
  stepIds: z.array(z.string().min(1)).min(8),
  misconceptionIds: z.array(z.string().min(1)).min(3),
  diagnosticQuestionIds: z.array(z.string().min(1)).min(3),
  independentCheckQuestionIds: z.array(z.string().min(1)).min(3),
  estimatedMinutes: z.number().int().min(8).max(90),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});
export type TeachingUnit = z.infer<typeof TeachingUnitSchema>;
