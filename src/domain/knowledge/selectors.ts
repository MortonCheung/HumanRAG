import type { KnowledgeLibrary, KnowledgeTree, KnowledgePoint, KnowledgeRelation } from './types';

interface KnowledgeRegistry {
  libraries: Map<string, KnowledgeLibrary>;
  trees: Map<string, KnowledgeTree>;
  points: Map<string, KnowledgePoint>;
  relations: KnowledgeRelation[];
  memberships: Array<{ treeId: string; pointId: string; role: string }>;
}

let _registry: KnowledgeRegistry | null = null;

export function initRegistry(registry: KnowledgeRegistry) {
  _registry = registry;
}

export function getRegistry(): KnowledgeRegistry {
  if (!_registry) throw new Error('KnowledgeRegistry not initialized');
  return _registry;
}

function ensureRegistry(): KnowledgeRegistry {
  if (!_registry) throw new Error('KnowledgeRegistry not initialized');
  return _registry;
}

export function getLibrary(id: string): KnowledgeLibrary | undefined {
  return ensureRegistry().libraries.get(id);
}

export function getTree(id: string): KnowledgeTree | undefined {
  return ensureRegistry().trees.get(id);
}

export function getPoint(id: string): KnowledgePoint | undefined {
  return ensureRegistry().points.get(id);
}

export function getPointsForTree(treeId: string): KnowledgePoint[] {
  const tree = getTree(treeId);
  if (!tree) return [];
  const registry = ensureRegistry();
  return tree.pointIds.map((id) => registry.points.get(id)).filter(Boolean) as KnowledgePoint[];
}

export function getTreesForLibrary(libraryId: string): KnowledgeTree[] {
  const lib = getLibrary(libraryId);
  if (!lib) return [];
  const registry = ensureRegistry();
  return lib.treeIds.map((id) => registry.trees.get(id)).filter(Boolean) as KnowledgeTree[];
}

export function getRelationsForPoint(pointId: string): KnowledgeRelation[] {
  return ensureRegistry().relations.filter(
    (r) => r.sourcePointId === pointId || r.targetPointId === pointId,
  );
}

export function getTreesForPoint(pointId: string): string[] {
  return ensureRegistry()
    .memberships.filter((m) => m.pointId === pointId)
    .map((m) => m.treeId);
}

export function isPointActionable(point: KnowledgePoint): boolean {
  return point.kind === 'knowledge' || point.kind === 'practice';
}

export function getChildrenForPoint(treeId: string, pointId: string): KnowledgePoint[] {
  const registry = ensureRegistry();
  const memberships = registry.memberships.filter((m) => m.treeId === treeId);
  // Children are determined by membership role: points with role 'branch' or 'leaf' that are not this point
  // and that have a prerequisite relation pointing from this point
  const childIds = new Set(
    registry.relations
      .filter((r) => r.sourcePointId === pointId && r.type === 'prerequisite')
      .map((r) => r.targetPointId),
  );
  return memberships
    .filter((m) => childIds.has(m.pointId))
    .map((m) => registry.points.get(m.pointId))
    .filter(Boolean) as KnowledgePoint[];
}

export function getPrerequisitesForPoint(pointId: string): KnowledgePoint[] {
  const registry = ensureRegistry();
  const ids = registry.relations
    .filter((r) => r.targetPointId === pointId && r.type === 'prerequisite')
    .map((r) => r.sourcePointId);
  return ids.map((id) => registry.points.get(id)).filter(Boolean) as KnowledgePoint[];
}

export function getRelatedForPoint(pointId: string): KnowledgePoint[] {
  const registry = ensureRegistry();
  const ids = registry.relations
    .filter((r) => (r.sourcePointId === pointId || r.targetPointId === pointId) && r.type === 'related')
    .map((r) => (r.sourcePointId === pointId ? r.targetPointId : r.sourcePointId));
  return ids.map((id) => registry.points.get(id)).filter(Boolean) as KnowledgePoint[];
}

export function getRootPointsForTree(treeId: string): KnowledgePoint[] {
  const registry = ensureRegistry();
  const tree = getTree(treeId);
  if (!tree) return [];
  const hasParent = new Set(
    registry.relations
      .filter((r) => r.type === 'prerequisite')
      .map((r) => r.targetPointId),
  );
  return tree.pointIds
    .filter((id) => !hasParent.has(id))
    .map((id) => registry.points.get(id))
    .filter(Boolean) as KnowledgePoint[];
}
