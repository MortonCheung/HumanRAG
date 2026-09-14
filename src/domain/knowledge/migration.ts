import { knowledgeGraph } from '../../data/knowledgeGraph';
import type { KnowledgeNode } from '../../graph/types';
import type { KnowledgeLibrary, KnowledgeTree, KnowledgePoint, KnowledgeRelation, TreeMembership, PointDraft, TreeIdentity } from './types';
import { createSystemTrees, createComputerLibrary } from './catalog';
import { adaptNodeToPoint, adaptEdgeToRelation, buildTreeMemberships, populateTreePointIds } from './adapters';
import { initRegistry } from './selectors';

export const V9_STORAGE_KEY = 'iteach:v9:domain';
const V1_PROFILE_KEY = 'knowledge-universe:profile:v1';
export type SaveResult = { ok: true } | { ok: false; error: string };
const storageError = (): SaveResult => ({ ok: false, error: '未能保存到本机，请检查浏览器存储后重试。' });

function validPosition(position: unknown): position is [number, number, number] {
  return Array.isArray(position) && position.length === 3 && position.every((value) => typeof value === 'number' && Number.isFinite(value));
}

function isPersistedState(value: unknown): value is V9PersistedState {
  if (!value || typeof value !== 'object') return false;
  const state = value as V9PersistedState;
  return state.version === 9 && Boolean(state.library?.id) && Array.isArray(state.library.treeIds)
    && Array.isArray(state.trees) && Array.isArray(state.userTrees) && Array.isArray(state.memberships)
    && Array.isArray(state.relations) && Array.isArray(state.points)
    && state.points.every((point) => Boolean(point?.id) && validPosition(point.position));
}

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

function registerState(state: V9PersistedState): void {
  initRegistry({
    libraries: new Map([[state.library.id, state.library]]),
    trees: new Map([...state.trees, ...state.userTrees].map((tree) => [tree.id, tree])),
    points: new Map(state.points.map((point) => [point.id, point])),
    relations: state.relations,
    memberships: state.memberships,
  });
}

/** Restore the canonical knowledge domain after an explicit demo reset. */
export function resetV9Domain(): SaveResult {
  const state = buildFromGraph();
  try {
    localStorage.setItem(V9_STORAGE_KEY, JSON.stringify(state));
  } catch {
    registerState(state);
    return storageError();
  }
  registerState(state);
  return { ok: true };
}

export function migrateV9(): {
  library: KnowledgeLibrary;
  trees: KnowledgeTree[];
  points: KnowledgePoint[];
  relations: KnowledgeRelation[];
  memberships: TreeMembership[];
  userTrees: KnowledgeTree[];
} {
  // A damaged or inaccessible saved record must never be replaced by demo data.
  let mayInitialize = false;
  try {
    const raw = localStorage.getItem(V9_STORAGE_KEY);
    mayInitialize = raw === null;
    if (raw) {
      const parsed = JSON.parse(raw) as V9PersistedState;
      if (isPersistedState(parsed)) {
        registerState(parsed);
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
    if (mayInitialize) localStorage.setItem(V9_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }

  registerState(state);

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
): SaveResult {
  const state: V9PersistedState = {
    version: 9,
    library,
    trees,
    points,
    relations,
    memberships,
    userTrees,
  };
  if (points.some((point) => !validPosition(point.position))) return { ok: false, error: '节点位置必须是三个有限数值。' };
  try {
    // Do not turn a corrupt or newer saved document into a fresh demo on the next edit.
    const previous = localStorage.getItem(V9_STORAGE_KEY);
    if (previous && !isPersistedState(JSON.parse(previous))) return { ok: false, error: '本机知识库数据无法读取，原始数据已保留。' };
    localStorage.setItem(V9_STORAGE_KEY, JSON.stringify(state));
    registerState(state);
    return { ok: true };
  } catch {
    return storageError();
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

export interface CreateTreeInput {
  identity: TreeIdentity;
  pointIds?: string[];
}

export function deriveTreeMemberships(
  treeId: string,
  pointIds: string[],
  relations: KnowledgeRelation[],
): TreeMembership[] {
  const pointSet = new Set(pointIds);
  const structural = relations.filter((relation) => pointSet.has(relation.sourcePointId)
    && pointSet.has(relation.targetPointId)
    && (relation.type === 'hierarchy' || relation.type === 'prerequisite' || relation.type === 'practice_for'));
  const hasParent = new Set(structural.map((relation) => relation.targetPointId));
  const hasChild = new Set(structural.map((relation) => relation.sourcePointId));
  return pointIds.map((pointId, order) => ({
    treeId,
    pointId,
    role: !hasParent.has(pointId) ? 'root' : hasChild.has(pointId) ? 'branch' : 'leaf',
    order,
  }));
}

export function createTree(libraryId: string, input: CreateTreeInput): KnowledgeTree {
  const state = migrateV9();
  if (state.library.id !== libraryId) throw new Error('未找到这个知识库。');
  const { identity } = input;
  if (!identity.name.trim()) throw new Error('请填写知识树名称。');
  if (checkDuplicateTreeName(identity.name, [...state.trees, ...state.userTrees])) throw new Error('这个知识库中已经有同名知识树。');
  const validPointIds = [...new Set(input.pointIds ?? [])];
  const pointSet = new Set(state.points.map((point) => point.id));
  if (validPointIds.some((pointId) => !pointSet.has(pointId))) throw new Error('知识树包含不存在的知识点。');
  const now = new Date().toISOString();
  const tree: KnowledgeTree = {
    id: `tree-${crypto.randomUUID()}`,
    libraryId,
    name: identity.name.trim(),
    description: identity.description,
    color: identity.color || '#8b7355',
    ownerType: 'user',
    pointIds: validPointIds,
    createdAt: now,
    updatedAt: now,
  };
  const userTrees = [...state.userTrees, tree];
  const library = { ...state.library, treeIds: [...state.library.treeIds, tree.id] };
  const memberships = [...state.memberships, ...deriveTreeMemberships(tree.id, validPointIds, state.relations)];
  const result = saveV9State(library, state.trees, state.points, state.relations, memberships, userTrees);
  if (!result.ok) throw new Error(result.error);
  return tree;
}

export function updateTree(treeId: string, patch: Partial<Pick<KnowledgeTree, 'name' | 'description' | 'color'>>) {
  const state = migrateV9();
  if (![...state.trees, ...state.userTrees].some((tree) => tree.id === treeId)) return { ok: false as const, error: '未找到这个知识树。' };
  if (patch.name !== undefined && !patch.name.trim()) return { ok: false as const, error: '请填写知识树名称。' };
  if (patch.name !== undefined && checkDuplicateTreeName(patch.name, [...state.trees, ...state.userTrees], treeId)) return { ok: false as const, error: '这个知识库中已经有同名知识树。' };
  const now = new Date().toISOString();
  const apply = (list: KnowledgeTree[]) =>
    list.map((t) => (t.id === treeId ? { ...t, ...patch, updatedAt: now } : t));
  return saveV9State(state.library, apply(state.trees), state.points, state.relations, state.memberships, apply(state.userTrees));
}

export function deleteTree(treeId: string) {
  const state = migrateV9();
  if (!state.userTrees.some((tree) => tree.id === treeId)) return { ok: false as const, error: '只能删除自己创建的知识树。' };
  const library = { ...state.library, treeIds: state.library.treeIds.filter((id) => id !== treeId) };
  const userTrees = state.userTrees.filter((t) => t.id !== treeId);
  const memberships = state.memberships.filter((membership) => membership.treeId !== treeId);
  const retainedIds = new Set(memberships.map((membership) => membership.pointId));
  const removedIds = new Set(state.memberships.filter((membership) => membership.treeId === treeId && !retainedIds.has(membership.pointId)).map((membership) => membership.pointId));
  return saveV9State(library, state.trees, state.points.filter((point) => !removedIds.has(point.id)), state.relations.filter((relation) => !removedIds.has(relation.sourcePointId) && !removedIds.has(relation.targetPointId)), memberships, userTrees);
}

export function createPoint(
  treeId: string,
  draft: Omit<PointDraft, 'id' | 'treeId'> & { id?: string },
): KnowledgePoint {
  const state = migrateV9();
  const tree = [...state.trees, ...state.userTrees].find((candidate) => candidate.id === treeId);
  if (!tree) throw new Error('未找到这个知识树。');
  if (!draft.name.trim()) throw new Error('请填写知识点名称。');
  const parentIds = [...new Set([draft.parentId, ...draft.prerequisiteIds].filter((id): id is string => Boolean(id)))];
  const relatedIds = [...new Set(draft.relatedIds)];
  const validIds = new Set(tree.pointIds.filter((id) => state.points.some((point) => point.id === id)));
  if ([...parentIds, ...relatedIds].some((id) => !validIds.has(id))) throw new Error('关联节点已不存在，请重新选择。');
  const existing = draft.id && state.points.find((point) => point.id === draft.id);
  // A retried submission owns the same id; it must not append a second object or relation.
  if (existing) {
    if (tree.pointIds.includes(existing.id)) return existing;
    throw new Error('这个节点已经存在于另一棵知识树。');
  }
  const point: KnowledgePoint = {
    id: draft.id || `point-${crypto.randomUUID()}`,
    name: draft.name.trim(),
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
    ...parentIds.map((src) => ({
      id: `rel-${point.id}-pre-${src}`,
      sourcePointId: src,
      targetPointId: point.id,
      type: 'prerequisite' as const,
    })),
    ...relatedIds.map((other) => ({
      id: `rel-${point.id}-rel-${other}`,
      sourcePointId: point.id,
      targetPointId: other,
      type: 'related' as const,
    })),
  ];
  const now = new Date().toISOString();
  const attach = (list: KnowledgeTree[]) =>
    list.map((t) => (t.id === treeId ? { ...t, pointIds: [...t.pointIds, point.id], updatedAt: now } : t));
  const result = saveV9State(state.library, attach(state.trees), points, newRelations, memberships, attach(state.userTrees));
  if (!result.ok) throw new Error(result.error);
  return point;
}

export function updatePoint(
  pointId: string,
  patch: Partial<Pick<KnowledgePoint, 'name' | 'kind' | 'description' | 'content' | 'color' | 'difficulty' | 'estimatedMinutes' | 'position' | 'tags' | 'learningObjectives' | 'misconceptions' | 'recommendedContent'>>,
) {
  const state = migrateV9();
  if (!state.points.some((point) => point.id === pointId)) return { ok: false as const, error: '未找到该知识点。' };
  if (patch.name !== undefined && !patch.name.trim()) return { ok: false as const, error: '请填写知识点名称。' };
  if (patch.position !== undefined && !validPosition(patch.position)) return { ok: false as const, error: '节点位置必须是三个有限数值。' };
  const points = state.points.map((p) => (p.id === pointId ? { ...p, ...patch } : p));
  return saveV9State(state.library, state.trees, points, state.relations, state.memberships, state.userTrees);
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
  const currentPoint = state.points.find((point) => point.id === pointId);
  if (!tree || !currentPoint || !tree.pointIds.includes(pointId)) return { ok: false, error: '未找到该知识点。' };
  if (!draft.name.trim()) return { ok: false, error: '请填写知识点名称。' };
  const validIds = new Set(tree.pointIds.filter((id) => id !== pointId && state.points.some((point) => point.id === id)));
  const parentIds = [...new Set([draft.parentId, ...draft.prerequisiteIds].filter((id): id is string => Boolean(id)))];
  if ([...parentIds, ...draft.relatedIds].some((id) => !validIds.has(id))) return { ok: false, error: '不能关联自己或已删除的节点。' };
  if (wouldCreateCycle(state.relations, pointId, parentIds)) return { ok: false, error: '该关系会形成循环，请重新选择上级。' };
  const relatedIds = [...new Set(draft.relatedIds.filter((id) => validIds.has(id)))];
  const point: KnowledgePoint = {
    id: pointId,
    name: draft.name.trim() || '未命名知识点',
    kind: draft.kind,
    description: draft.description,
    content: draft.content,
    color: draft.color,
    // Content and relation drafts never own an already committed spatial position.
    position: currentPoint.position,
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
  return saveV9State(state.library, touch(state.trees), points, relations, state.memberships, touch(state.userTrees));
}

export function deletePoint(treeId: string, pointId: string) {
  const state = migrateV9();
  if (![...state.trees, ...state.userTrees].some((tree) => tree.id === treeId && tree.pointIds.includes(pointId))) return { ok: false as const, error: '未找到该知识点。' };
  const points = state.points.filter((p) => p.id !== pointId);
  const relations = state.relations.filter(
    (r) => r.sourcePointId !== pointId && r.targetPointId !== pointId,
  );
  const memberships = state.memberships.filter((m) => m.pointId !== pointId);
  const detach = (list: KnowledgeTree[]) =>
    list.map((t) =>
      t.pointIds.includes(pointId)
        ? { ...t, pointIds: t.pointIds.filter((id) => id !== pointId), updatedAt: new Date().toISOString() }
        : t,
    );
  return saveV9State(state.library, detach(state.trees), points, relations, memberships, detach(state.userTrees));
}
