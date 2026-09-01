import type { KnowledgePoint, KnowledgeRelation } from '../../domain/knowledge/types';
import type { CustomEdge, CustomNode, CustomRelationType } from '../../store/libraryStore';

export function toCustomNodes(points: KnowledgePoint[]): CustomNode[] {
  return points.map((point) => ({
    id: point.id,
    name: point.name,
    kind: point.kind === 'course' ? 'course' : point.kind === 'skill' ? 'topic' : 'knowledge',
    description: point.description,
    x: point.position[0],
    y: point.position[1],
    z: point.position[2],
    position: [...point.position],
    color: point.color,
    difficulty: point.difficulty,
    estimatedMinutes: point.estimatedMinutes,
    tags: point.tags,
    content: point.content,
    learningObjectives: point.learningObjectives,
    misconceptions: point.misconceptions,
    recommendedContent: point.recommendedContent,
  }));
}

export function toCustomEdges(relations: KnowledgeRelation[], pointIds: Set<string>): CustomEdge[] {
  return relations
    .filter((relation) => pointIds.has(relation.sourcePointId) && pointIds.has(relation.targetPointId))
    .map((relation) => ({
      id: relation.id,
      source: relation.sourcePointId,
      target: relation.targetPointId,
      relationType: relation.type as CustomRelationType,
    }));
}
