import type { KnowledgePoint, KnowledgeRelation } from '../../domain/knowledge/types';

export function filterTreePoints(points: KnowledgePoint[], query: string, pointFilterId?: string | null) {
  if (pointFilterId) return points.filter((point) => point.id === pointFilterId);
  const words = query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return points.filter((point) => {
    const searchable = `${point.name} ${point.tags.join(' ')}`.normalize('NFKC').toLocaleLowerCase();
    return words.every((word) => searchable.includes(word));
  });
}

/** Group by the existing hierarchy, without inventing a second curriculum model. */
export function groupTreePoints(points: KnowledgePoint[], allPoints: Map<string, KnowledgePoint>, relations: KnowledgeRelation[]) {
  const parents = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.type !== 'hierarchy' && relation.type !== 'practice_for') continue;
    parents.set(relation.targetPointId, [...(parents.get(relation.targetPointId) ?? []), relation.sourcePointId]);
  }
  const groups = new Map<string, { id: string; name: string; points: KnowledgePoint[] }>();
  for (const point of points) {
    const queue = [...(parents.get(point.id) ?? [])];
    const seen = new Set([point.id]);
    let subject: KnowledgePoint | undefined;
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const parent = allPoints.get(id);
      if (parent?.kind === 'course') { subject = parent; break; }
      queue.push(...(parents.get(id) ?? []));
    }
    const id = subject?.id ?? 'ungrouped';
    const group = groups.get(id) ?? { id, name: subject?.name ?? '知识点', points: [] };
    group.points.push(point);
    groups.set(id, group);
  }
  return [...groups.values()];
}
