import { UserLibrarySchema } from '../../data/v6/schemas/customContentSchema';
import type { CustomEdge, LibraryDraft } from '../../store/libraryStore';
import type { BuilderStep } from './types';

/**
 * 发布前完整校验（蓝图 §9.5 / §15.3）：节点、关系、教学、题目、引用与图结构。
 * 每一条错误定位到对应步骤，供预览步骤点击跳转。
 */

export interface ValidationIssue {
  step: BuilderStep;
  message: string;
}

export interface LibraryValidation {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** 有向图环检测（DFS 三色标记）。 */
function hasCycle(edges: CustomEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };
  for (const nodeId of adjacency.keys()) {
    if (visit(nodeId)) return true;
  }
  return false;
}

export function validateLibrary(draft: LibraryDraft | null): LibraryValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!draft) {
    return {
      valid: false,
      errors: [{ step: 'source', message: '尚未创建草稿，请先回到「来源」解析资料或载入模板。' }],
      warnings,
    };
  }

  // 名称与必填字段
  if (!draft.name.trim()) {
    errors.push({ step: 'source', message: '知识库名称不能为空。' });
  }

  // 节点数量
  if (draft.nodes.length === 0) {
    errors.push({ step: 'structure', message: '至少需要一个节点，请回到「来源」解析或载入模板。' });
  }

  const nodeIds = new Set(draft.nodes.map((node) => node.id));

  // 关系数量
  if (draft.edges.length === 0) {
    errors.push({ step: 'structure', message: '至少需要一条关系，请回到「结构」建立节点连接。' });
  }

  // 自环
  const selfLoop = draft.edges.find((edge) => edge.source === edge.target);
  if (selfLoop) {
    errors.push({ step: 'structure', message: '存在自环关系，节点不能连接自己。' });
  }

  // 悬空引用
  const dangling = draft.edges.find((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target));
  if (dangling) {
    errors.push({ step: 'structure', message: '存在引用已删除节点的关系。' });
  }

  // hierarchy 循环
  if (hasCycle(draft.edges.filter((edge) => edge.relationType === 'hierarchy'))) {
    errors.push({ step: 'structure', message: '「包含」关系存在循环，请检查节点层级。' });
  }

  // prerequisite 循环只给警告
  if (hasCycle(draft.edges.filter((edge) => edge.relationType === 'prerequisite'))) {
    warnings.push({ step: 'structure', message: '「前置」关系存在循环，可能导致学习路径无法推进。' });
  }

  // 教学单元
  if (draft.teachingUnits.length === 0) {
    errors.push({ step: 'teaching', message: '至少生成一个教学单元，请回到「教学」生成。' });
  }

  const unitNodeMissing = draft.teachingUnits.find((unit) => !nodeIds.has(unit.nodeId));
  if (unitNodeMissing) {
    errors.push({ step: 'teaching', message: '存在教学单元引用了已删除的节点。' });
  }

  // 题目
  if (draft.questions.length === 0) {
    errors.push({ step: 'questions', message: '至少生成一组题目，请回到「题目」生成。' });
  }

  const questionNodeMissing = draft.questions.find((question) =>
    question.nodeIds.some((nodeId) => !nodeIds.has(nodeId)),
  );
  if (questionNodeMissing) {
    errors.push({ step: 'questions', message: '存在题目引用了已删除的节点。' });
  }

  // Zod 校验完整对象
  const parsed = UserLibrarySchema.safeParse(draft);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    errors.push({
      step: 'preview',
      message: `数据结构校验失败：${first ? `${first.path.join('.')} ${first.message}` : '未知错误'}`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
