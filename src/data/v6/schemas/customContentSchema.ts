import { z } from 'zod';
import { TeachingStepSchema, TeachingUnitSchema } from './teachingSchema';
import { QuestionSchema } from './questionSchema';

/**
 * 自定义知识库的完整内容（蓝图 §14.2）：不能只保存教学单元与题目的 id，
 * 必须保存完整的教学单元、教学步骤与题目，供 ContentRepository 统一读取。
 */
export const CustomContentSchema = z.object({
  teachingUnits: z.array(TeachingUnitSchema),
  teachingSteps: z.array(TeachingStepSchema),
  questions: z.array(QuestionSchema),
});
export type CustomContent = z.infer<typeof CustomContentSchema>;

export const CustomNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['course', 'topic', 'knowledge']),
  description: z.string(),
  x: z.number(),
  y: z.number(),
  domain: z.string().optional(),
  color: z.string().optional(),
  layer: z.number().optional(),
  difficulty: z.enum(['基础', '进阶', '挑战']).optional(),
  estimatedMinutes: z.number().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().optional(),
  learningObjectives: z.array(z.string()).optional(),
  misconceptions: z.array(z.string()).optional(),
  recommendedContent: z.array(z.string()).optional(),
});
export type CustomNode = z.infer<typeof CustomNodeSchema>;

export const CustomEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relationType: z.enum(['hierarchy', 'prerequisite', 'related', 'practice_for']),
});
export type CustomEdge = z.infer<typeof CustomEdgeSchema>;

/** 发布前用 Zod 校验完整用户知识库对象（蓝图 §15.3）。 */
export const UserLibrarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  domain: z.string().min(1),
  ownerType: z.literal('user'),
  nodes: z.array(CustomNodeSchema),
  edges: z.array(CustomEdgeSchema),
  sourceIds: z.array(z.string()),
  teachingUnitIds: z.array(z.string()),
  questionIds: z.array(z.string()),
  teachingUnits: z.array(TeachingUnitSchema),
  teachingSteps: z.array(TeachingStepSchema),
  questions: z.array(QuestionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserLibrary = z.infer<typeof UserLibrarySchema>;
