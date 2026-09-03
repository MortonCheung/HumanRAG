import { knowledgeGraph } from '../../data/knowledgeGraph';
import type { KnowledgeNode } from '../../graph/types';
import type { KnowledgeLibrary, KnowledgeTree, KnowledgePoint, KnowledgeRelation, TreeMembership, PointDraft } from './types';
import { createSystemTrees, createComputerLibrary } from './catalog';
import { adaptNodeToPoint, adaptEdgeToRelation, buildTreeMemberships, populateTreePointIds } from './adapters';
import { initRegistry } from './selectors';

const V9_STORAGE_KEY = 'iteach:v9:domain';
const V1_PROFILE_KEY = 'knowledge-universe:profile:v1';

interface V9PersistedState {
  version: 9;
  library: KnowledgeLibrary;
  trees: KnowledgeTree[];
  points: KnowledgePoint[];
  relations: KnowledgeRelation[];
  memberships: TreeMembership[];
  userTrees: KnowledgeTree[];
}

function buildFromGraph(): V9PersistedState {
  const trees = createSystemTrees();
  const points = knowledgeGraph.nodes.map(adaptNodeToPoint);
  const relations = knowledgeGraph.edges.map(adaptEdgeToRelation);
  const memberships = buildTreeMemberships(knowledgeGraph.nodes);
  const populatedTrees = populateTreePointIds(trees, knowledgeGraph.nodes);
  const library = createComputerLibrary(populatedTrees);

  return {
    version: 9,
    library,
    trees: populatedTrees,
    points,
    relations,
    memberships,
    userTrees: [],
  };
}

export function migrateV9(): {
  library: KnowledgeLibrary;
  trees: KnowledgeTree[];
  points: KnowledgePoint[];
  relations: KnowledgeRelation[];
  memberships: TreeMembership[];
  userTrees: KnowledgeTree[];
} {
  // Try loading existing V9 state
  try {
    const raw = localStorage.getItem(V9_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as V9PersistedState;
      if (parsed.version === 9) {
        initRegistry({
          libraries: new Map([[parsed.library.id, parsed.library]]),
          trees: new Map([...parsed.trees, ...parsed.userTrees].map((t) => [t.id, t])),
          points: new Map(parsed.points.map((p) => [p.id, p])),
          relations: parsed.relations,
          memberships: parsed.memberships,
        });
        return {
          library: parsed.library,
          trees: parsed.trees,
          points: parsed.points,
          relations: parsed.relations,
          memberships: parsed.memberships,
          userTrees: parsed.userTrees,
        };
      }
    }
  } catch {
    // Continue to build from graph
  }

  // Build fresh from existing graph data
  const state = buildFromGraph();

  // Save
  try {
    localStorage.setItem(V9_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }

  initRegistry({
    libraries: new Map([[state.library.id, state.library]]),
    trees: new Map([...state.trees, ...state.userTrees].map((t) => [t.id, t])),
    points: new Map(state.points.map((p) => [p.id, p])),
    relations: state.relations,
    memberships: state.memberships,
  });

  return {
    library: state.library,
    trees: state.trees,
    points: state.points,
    relations: state.relations,
    memberships: state.memberships,
    userTrees: state.userTrees,
  };
}

export function saveV9State(
  library: KnowledgeLibrary,
  trees: KnowledgeTree[],
  points: KnowledgePoint[],
  relations: KnowledgeRelation[],
  memberships: TreeMembership[],
  userTrees: KnowledgeTree[],
) {
  const state: V9PersistedState = {
    version: 9,
    library,
    trees,
    points,
    relations,
    memberships,
    userTrees,
  };
  try {
    localStorage.setItem(V9_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function normalizeTreeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
}

export function checkDuplicateTreeName(
  name: string,
  existingTrees: KnowledgeTree[],
  excludeTreeId?: string,
): boolean {
  const normalized = normalizeTreeName(name);
  if (!normalized) return false;
  return existingTrees.some(
    (t) => normalizeTreeName(t.name) === normalized && t.id !== excludeTreeId,
  );
}

export function generateAnonymousTreeName(existingTrees: KnowledgeTree[]): string {
  let index = 1;
  while (true) {
    const name = `未命名知识树 ${String(index).padStart(2, '0')}`;
    if (!checkDuplicateTreeName(name, existingTrees)) return name;
    index++;
  }
}

export function clearLegacyProfile() {
  try {
    localStorage.removeItem(V1_PROFILE_KEY);
  } catch {
    // Ignore
  }
}

export function createTree(libraryId: string, identity: { name: string; description: string; color: string }): KnowledgeTree {
  const state = migrateV9();
  const now = new Date().toISOString();
  const tree: KnowledgeTree = {
    id: `tree-${Date.now()}`,
    libraryId,
    name: identity.name,
    description: identity.description,
    color: identity.color || '#8b7355',
    ownerType: 'user',
    pointIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const userTrees = [...state.userTrees, tree];
  const library = { ...state.library, treeIds: [...state.library.treeIds, tree.id] };
  saveV9State(library, state.trees, state.points, state.relations, state.memberships, userTrees);
  migrateV9();
  return tree;
}

export function updateTree(treeId: string, patch: Partial<Pick<KnowledgeTree, 'name' | 'description' | 'color'>>) {
  const state = migrateV9();
  const now = new Date().toISOString();
  const apply = (list: KnowledgeTree[]) =>
    list.map((t) => (t.id === treeId ? { ...t, ...patch, updatedAt: now } : t));
  saveV9State(state.library, apply(state.trees), state.points, state.relations, state.memberships, apply(state.userTrees));
  migrateV9();
}

export function deleteTree(treeId: string) {
  const state = migrateV9();
  const library = { ...state.library, treeIds: state.library.treeIds.filter((id) => id !== treeId) };
  const userTrees = state.userTrees.filter((t) => t.id !== treeId);
  saveV9State(library, state.trees, state.points, state.relations, state.memberships, userTrees);
  migrateV9();
}

export function createPoint(
  treeId: string,
  draft: Omit<PointDraft, 'id' | 'treeId'>,
): KnowledgePoint {
  const state = migrateV9();
  const point: KnowledgePoint = {
    id: `point-${Date.now()}`,
    name: draft.name,
    kind: draft.kind,
    description: draft.description,
    content: draft.content,
    color: draft.color,
    position: draft.position ?? [0, -10, 0],
    difficulty: draft.difficulty,
    estimatedMinutes: draft.estimatedMinutes,
    tags: draft.tags,
    learningObjectives: draft.learningObjectives,
    misconceptions: draft.misconceptions,
    recommendedContent: draft.recommendedContent,
  };
  const points = [...state.points, point];
  const memberships: TreeMembership[] = [
    ...state.memberships,
    { treeId, pointId: point.id, role: 'leaf' },
  ];
  const newRelations: KnowledgeRelation[] = [
    ...state.relations,
    ...(draft.parentId
      ? [{ id: `rel-${point.id}-parent`, sourcePointId: draft.parentId, targetPointId: point.id, type: 'prerequisite' as const }]
      : []),
    ...draft.prerequisiteIds.map((src) => ({
      id: `rel-${point.id}-pre-${src}`,
      sourcePointId: src,
      targetPointId: point.id,
      type: 'prerequisite' as const,
    })),
    ...draft.relatedIds.map((other) => ({
      id: `rel-${point.id}-rel-${other}`,
      sourcePointId: point.id,
      targetPointId: other,
      type: 'related' as const,
    })),
  ];
  const now = new Date().toISOString();
  const attach = (list: KnowledgeTree[]) =>
    list.map((t) => (t.id === treeId ? { ...t, pointIds: [...t.pointIds, point.id], updatedAt: now } : t));
  saveV9State(state.library, attach(state.trees), points, newRelations, memberships, attach(state.userTrees));
  migrateV9();
  return point;
}

export function updatePoint(
  pointId: string,
  patch: Partial<Pick<KnowledgePoint, 'name' | 'kind' | 'description' | 'content' | 'color' | 'difficulty' | 'estimatedMinutes' | 'position' | 'tags' | 'learningObjectives' | 'misconceptions' | 'recommendedContent'>>,
) {
  const state = migrateV9();
  const points = state.points.map((p) => (p.id === pointId ? { ...p, ...patch } : p));
  saveV9State(state.library, state.trees, points, state.relations, state.memberships, state.userTrees);
  migrateV9();
}

export function hydratePointDraft(treeId: string, pointId: string): PointDraft | null {
  const state = migrateV9();
  const tree = [...state.trees, ...state.userTrees].find((candidate) => candidate.id === treeId);
  const point = state.points.find((candidate) => candidate.id === pointId);
  if (!tree || !point || !tree.pointIds.includes(pointId)) return null;
  const treeIds = new Set(tree.pointIds);
  const prerequisites = state.relations
    .filter((relation) => relation.type === 'prerequisite' && relation.targetPointId === pointId && treeIds.has(relation.sourcePointId))
    .map((relation) => relation.sourcePointId);
  const relatedIds = state.relations
    .filter((relation) => relation.type === 'related' && (relation.sourcePointId === pointId || relation.targetPointId === pointId))
    .map((relation) => relation.sourcePointId === pointId ? relation.targetPointId : relation.sourcePointId)
    .filter((id) => treeIds.has(id));
  const childIds = state.relations
    .filter((relation) => relation.type === 'prerequisite' && relation.sourcePointId === pointId && treeIds.has(relation.targetPointId))
    .map((relation) => relation.targetPointId);
  return {
    ...point,
    treeId,
    parentId: prerequisites[0],
    prerequisiteIds: prerequisites.slice(1),
    relatedIds: [...new Set(relatedIds)],
    childIds,
    position: [...point.position],
  };
}

function wouldCreateCycle(relations: KnowledgeRelation[], pointId: string, candidateParentIds: string[]) {
  const childrenBySource = new Map<string, string[]>();
  relations.filter((relation) => relation.type === 'prerequisite' && relation.targetPointId !== pointId).forEach((relation) => {
    childrenBySource.set(relation.sourcePointId, [...(childrenBySource.get(relation.sourcePointId) ?? []), relation.targetPointId]);
  });
  const descendants = new Set<string>();
  const queue = [...(childrenBySource.get(pointId) ?? [])];
  while (queue.length) {
    const current = queue.shift()!;
    if (descendants.has(current)) continue;
    descendants.add(current);
    queue.push(...(childrenBySource.get(current) ?? []));
  }
  return candidateParentIds.some((id) => id === pointId || descendants.has(id));
}

export function savePointDraft(treeId: string, pointId: string, draft: PointDraft): { ok: true } | { ok: false; error: string } {
  const state = migrateV9();
  const allTrees = [...state.trees, ...state.userTrees];
  const tree = allTrees.find((candidate) => candidate.id === treeId);
  if (!tree || !tree.pointIds.includes(pointId)) return { ok: false, error: '未找到该知识点。' };
  const validIds = new Set(tree.pointIds.filter((id) => id !== pointId));
  const parentIds = [...new Set([draft.parentId, ...draft.prerequisiteIds].filter((id): id is string => Boolean(id) && validIds.has(id!)))];
  if (wouldCreateCycle(state.relations, pointId, parentIds)) return { ok: false, error: '该关系会形成循环，请重新选择上级。' };
  const relatedIds = [...new Set(draft.relatedIds.filter((id) => validIds.has(id)))];
  const point: KnowledgePoint = {
    id: pointId,
    name: draft.name.trim() || '未命名知识点',
    kind: draft.kind,
    description: draft.description,
    content: draft.content,
    color: draft.color,
    position: draft.position ?? [0, 0, 0],
    difficulty: draft.difficulty,
    estimatedMinutes: draft.estimatedMinutes,
    tags: draft.tags,
    learningObjectives: draft.learningObjectives,
    misconceptions: draft.misconceptions,
    recommendedContent: draft.recommendedContent,
  };
  const points = state.points.map((candidate) => candidate.id === pointId ? point : candidate);
  const preserved = state.relations.filter((relation) => {
    if (relation.type === 'prerequisite' && relation.targetPointId === pointId) return false;
    if (relation.type === 'related' && (relation.sourcePointId === pointId || relation.targetPointId === pointId)) return false;
    return true;
  });
  const relations: KnowledgeRelation[] = [
    ...preserved,
    ...parentIds.map((sourcePointId, index) => ({
      id: `rel-${pointId}-pre-${index}-${sourcePointId}`,
      sourcePointId,
      targetPointId: pointId,
      type: 'prerequisite' as const,
    })),
    ...relatedIds.map((targetPointId, index) => ({
      id: `rel-${pointId}-related-${index}-${targetPointId}`,
      sourcePointId: pointId,
      targetPointId,
      type: 'related' as const,
    })),
  ];
  const now = new Date().toISOString();
  const touch = (list: KnowledgeTree[]) => list.map((candidate) => candidate.id === treeId ? { ...candidate, updatedAt: now } : candidate);
  saveV9State(state.library, touch(state.trees), points, relations, state.memberships, touch(state.userTrees));
  migrateV9();
  return { ok: true };
}

export function deletePoint(treeId: string, pointId: string) {
  const state = migrateV9();
  const points = state.points.filter((p) => p.id !== pointId);
  const relations = state.relations.filter(
    (r) => r.sourcePointId !== pointId && r.targetPointId !== pointId,
  );
  const memberships = state.memberships.filter((m) => m.pointId !== pointId);
  const detach = (list: KnowledgeTree[]) =>
    list.map((t) =>
      t.id === treeId
        ? { ...t, pointIds: t.pointIds.filter((id) => id !== pointId), updatedAt: new Date().toISOString() }
        : t,
    );
  saveV9State(state.library, detach(state.trees), points, relations, memberships, detach(state.userTrees));
  migrateV9();
}
