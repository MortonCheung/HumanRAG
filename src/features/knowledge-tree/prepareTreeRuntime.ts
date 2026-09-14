import type { GoalTreeDraft } from '../../ai/knowledge-tree/GoalTreeComposer';
import { getRegistry } from '../../domain/knowledge/selectors';

/**
 * Validate the transient composition and warm the formal tree workspace while
 * the extraction scene is still running. This does not create new knowledge.
 */
export async function prepareTreeRuntime(draft: GoalTreeDraft) {
  await import('./KnowledgeTreeWorkspace');
  const registry = getRegistry();
  const points = draft.pointIds.map((pointId) => registry.points.get(pointId));
  if (points.some((point) => !point)) throw new Error('知识范围中包含已不存在的知识点。');
  return { pointIds: draft.pointIds, relationCount: registry.relations.filter((relation) => draft.pointIds.includes(relation.sourcePointId) && draft.pointIds.includes(relation.targetPointId)).length };
}
