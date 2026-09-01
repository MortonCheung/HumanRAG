/** 创建知识库五步编辑器：来源 → 结构 → 教学 → 题目 → 预览（蓝图 §11）。 */
export type BuilderStep = 'source' | 'structure' | 'teaching' | 'questions' | 'preview';

export const BUILDER_STEPS: Array<{ id: BuilderStep; label: string }> = [
  { id: 'source', label: '来源' },
  { id: 'structure', label: '结构' },
  { id: 'teaching', label: '教学' },
  { id: 'questions', label: '题目' },
  { id: 'preview', label: '预览' },
];
