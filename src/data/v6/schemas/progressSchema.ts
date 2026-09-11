import { z } from 'zod';

export const BranchIdSchema = z.enum(['408', 'ai', 'game', 'frontend']);
export type ProgressBranchId = z.infer<typeof BranchIdSchema>;

export const LearnerProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  major: z.string().min(1),
  identity: z.string().min(1),
  goal: z.string().min(1),
  branchId: BranchIdSchema,
  isDefault: z.boolean(),
});
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  nodeId: z.string().min(1),
  source: z.enum(['diagnostic', 'guided-practice', 'independent-check', 'practice']),
  result: z.enum(['correct', 'partial', 'incorrect']),
  misconceptionId: z.string().optional(),
  weight: z.number().min(0).max(1),
  createdAt: z.string().min(1),
  eventId: z.string().optional(),
  questionId: z.string().optional(),
  contentVersion: z.string().optional(),
  sessionId: z.string().optional(),
  attempt: z.number().int().positive().optional(),
  taskRole: z.enum(['diagnostic', 'clarification', 'guided', 'predict', 'observe']).optional(),
  assistance: z.enum(['independent', 'hint', 'demonstration', 'unknown']).optional(),
  firstExposure: z.boolean().optional(),
  // Present only on the last submitted evidence of a completed verification round.
  // The complete planned set is required; two answers from a longer round are not a pass.
  verificationQuestionIds: z.array(z.string().min(1)).min(2).refine((ids) => new Set(ids).size === ids.length).optional(),
  snapshot: z.object({ stem: z.string(), selected: z.string(), expected: z.string(), explanation: z.string() }).optional(),
  fragmentId: z.string().optional(),
  decisionReason: z.string().optional(),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const MasteryStateSchema = z.object({
  learnerId: z.string().min(1),
  nodeId: z.string().min(1),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)),
  lastReviewedAt: z.string().optional(),
  nextReviewAt: z.string().optional(),
});
export type MasteryState = z.infer<typeof MasteryStateSchema>;

export const AnswerRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  questionId: z.string().min(1),
  selected: z.string(),
  correct: z.boolean(),
  createdAt: z.string().min(1),
});
export type AnswerRecord = z.infer<typeof AnswerRecordSchema>;

export const MisconceptionRecordSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  misconceptionId: z.string().min(1),
  nodeId: z.string().min(1),
  occurrences: z.number().int().min(1),
  firstSeenAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
  status: z.enum(['open', 'remediated', 'suppressed']),
});
export type MisconceptionRecord = z.infer<typeof MisconceptionRecordSchema>;

export const RemediationTaskSchema = z.object({
  id: z.string().min(1),
  learnerId: z.string().min(1),
  unitId: z.string().min(1),
  misconceptionId: z.string().min(1),
  status: z.enum(['pending', 'in-progress', 'done']),
  createdAt: z.string().min(1),
  reason: z.string().min(1),
});
export type RemediationTask = z.infer<typeof RemediationTaskSchema>;

export const DemoHistorySchema = z.object({
  profiles: z.array(LearnerProfileSchema).min(1),
  answerRecords: z.array(AnswerRecordSchema),
  evidenceRecords: z.array(EvidenceRecordSchema),
  misconceptionRecords: z.array(MisconceptionRecordSchema),
  remediationTasks: z.array(RemediationTaskSchema),
  masteryByNode: z.array(MasteryStateSchema),
});
export type DemoHistory = z.infer<typeof DemoHistorySchema>;
