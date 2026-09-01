import { z } from 'zod';

export const KnowledgeBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  domain: z.string().min(1),
  ownerType: z.enum(['system', 'user']),
  nodeIds: z.array(z.string()),
  edgeIds: z.array(z.string()),
  sourceIds: z.array(z.string()),
  teachingUnitIds: z.array(z.string()),
  questionIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;

/** 大学课程模板：48 个，进入对应知识库时按需生成 48-180 个节点。 */
export const UniversityTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().min(1),
  topicCount: z.number().int().min(4).max(12),
  nodeCount: z.number().int().min(48).max(180),
});
export type UniversityTemplate = z.infer<typeof UniversityTemplateSchema>;

/** 模板物化后的节点，供 /library 详情与三维预览使用。 */
export const TemplateNodeSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['course', 'topic']),
  description: z.string().min(1),
  x: z.number(),
  y: z.number(),
});
export type TemplateNode = z.infer<typeof TemplateNodeSchema>;

export const TemplateEdgeSchema = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relationType: z.enum(['hierarchy', 'prerequisite', 'related']),
});
export type TemplateEdge = z.infer<typeof TemplateEdgeSchema>;
