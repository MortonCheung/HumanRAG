import { knowledgeGraph } from '../data/knowledgeGraph';
import { LEARNER_PROFILES } from '../data/v6/catalogs/learnerProfileCatalog';
import { getRegistry } from '../domain/knowledge/selectors';
import { recommendLearningNode, type RecommendationNode } from '../features/progress/learningRecommendation';
import { contentRepository } from '../services/content/ContentRepository';
import { useProgressStore } from '../store/progressStore';

/** Read adapter only: never initialize/migrate storage while deriving a recommendation. */
export function getRecommendationNodes(learnerId: string, pointIds?: readonly string[]): RecommendationNode[] {
  let registry: ReturnType<typeof getRegistry> | undefined;
  try { registry = getRegistry(); } catch { /* Domain is not initialized in isolated tests/legacy entry points. */ }
  const branchId = LEARNER_PROFILES.find((profile) => profile.id === learnerId)?.branchId ?? '408';
  const scope = new Set(pointIds ?? knowledgeGraph.nodes.filter((node) => node.branchId === branchId && node.type === 'knowledge').map((node) => node.id));
  return [...scope].flatMap((id): RecommendationNode[] => {
    const point = registry?.points.get(id);
    const node = contentRepository.getNode(id);
    const kind = point?.kind ?? node?.type;
    if (kind !== 'knowledge' && kind !== 'practice') return [];
    const prerequisites = registry
      ? registry.relations.filter((relation) => relation.type === 'prerequisite' && relation.targetPointId === id).map((relation) => relation.sourcePointId)
      : knowledgeGraph.edges.filter((edge) => edge.relationType === 'prerequisite' && edge.target === id).map((edge) => edge.source);
    // Course/branch nodes organize content; they are not independently assessed tasks.
    const prerequisiteIds = prerequisites.filter((sourceId) => {
      const sourcePoint = registry?.points.get(sourceId);
      const sourceNode = contentRepository.getNode(sourceId);
      return sourcePoint ? sourcePoint.kind === 'knowledge' || sourcePoint.kind === 'practice' : sourceNode?.type === 'knowledge' || sourceNode?.type === 'practice';
    });
    return [{ id, name: point?.name ?? node!.name, prerequisiteIds, unitId: contentRepository.getTeachingUnitForNode(id)?.id }];
  });
}

export function getLearningRecommendation(learnerId: string, pointIds?: readonly string[]) {
  const progress = useProgressStore.getState();
  return recommendLearningNode({
    learnerId,
    nodes: getRecommendationNodes(learnerId, pointIds),
    evidence: progress.evidenceRecords,
    remediationTasks: progress.remediationTasks,
  });
}
