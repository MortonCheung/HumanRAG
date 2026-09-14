import { knowledgeGraph, nodesById } from '../data/knowledgeGraph';
import type {
  CameraIntent,
  EdgeVisualState,
  KnowledgeNode,
  SceneModel,
  SceneNode,
  VisualState,
} from './types';
import { buildCausalCorridor } from './causalCorridor';
import { canonicalPosition } from './canonicalSpace';
import { colorForBranch } from '../design/domainPalette';
import type { LearningState } from '../domain/learning/deriveLearningState';

const descendantsCache = new Map<string, Map<string, number>>();
const adjacencyByNode = new Map<string, Set<string>>();
const hierarchyChildren = new Map<string, string[]>();
for (const edge of knowledgeGraph.edges) {
  if (edge.relationType === 'hierarchy') {
    const children = hierarchyChildren.get(edge.source) ?? [];
    children.push(edge.target);
    hierarchyChildren.set(edge.source, children);
  }
  if (!adjacencyByNode.has(edge.source)) adjacencyByNode.set(edge.source, new Set());
  if (!adjacencyByNode.has(edge.target)) adjacencyByNode.set(edge.target, new Set());
  adjacencyByNode.get(edge.source)!.add(edge.target);
  adjacencyByNode.get(edge.target)!.add(edge.source);
}

export interface SceneModelInput {
  goalId: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  learningPath: string[];
  focused: boolean;
  relationMode?: 'primary' | 'all' | 'upstream' | 'downstream';
  learningStates?: ReadonlyMap<string, LearningState>;
}

function descendants(seedId: string) {
  const cached = descendantsCache.get(seedId);
  if (cached) return cached;
  const depth = new Map<string, number>([[seedId, 0]]);
  const queue = [seedId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const child of hierarchyChildren.get(current) ?? []) {
      if (depth.has(child)) continue;
      depth.set(child, (depth.get(current) ?? 0) + 1);
      queue.push(child);
    }
  }
  descendantsCache.set(seedId, depth);
  return depth;
}

function ancestors(seedId: string | null) {
  const ids = new Set<string>();
  let current = seedId ? nodesById.get(seedId) : undefined;
  while (current) {
    ids.add(current.id);
    current = current.parentId ? nodesById.get(current.parentId) : undefined;
  }
  return ids;
}

function oneHop(seedId: string | null) {
  const ids = new Set<string>();
  if (!seedId) return ids;
  ids.add(seedId);
  adjacencyByNode.get(seedId)?.forEach((id) => ids.add(id));
  return ids;
}

function relevanceFor(
  node: KnowledgeNode,
  goalId: string | null,
  selectedNodeId: string | null,
  hoveredNodeId: string | null,
  activeDepth: Map<string, number>,
  localIds: Set<string>,
  learningPathIds: Set<string>,
) {
  if (node.id === selectedNodeId) return 1;
  if (node.id === hoveredNodeId) return 0.97;
  if (learningPathIds.has(node.id)) return 0.94;
  if (localIds.has(node.id)) return 0.76;
  if (!goalId) return node.type === 'goal' || node.type === 'direction' ? 0.42 : 0.12;
  if (
    node.type === 'goal' &&
    node.parentId === undefined &&
    knowledgeGraph.edges.some((edge) => edge.relationType === 'hierarchy' && edge.source === node.id && edge.target === goalId)
  ) return 0.86;

  const depth = activeDepth.get(node.id);
  if (depth !== undefined) {
    if (depth === 0) return 1;
    if (node.type === 'course' || node.type === 'skill') return 0.88;
    if (node.type === 'knowledge') return 0.78;
    if (node.type === 'practice') return 0.66;
    return 0.9;
  }

  const adjacentToActive = [...(adjacencyByNode.get(node.id) ?? [])].some((id) => activeDepth.has(id));
  return adjacentToActive ? 0.28 : 0.055;
}

function visualState(
  relevance: number,
  id: string,
  selectedId: string | null,
  upstream: Set<string>,
  downstream: Set<string>,
  lateral: Set<string>,
  learningPathIds: Set<string>,
): VisualState {
  if (id === selectedId) return 'selected';
  if (learningPathIds.has(id)) return 'recommendedPath';
  if (upstream.has(id)) return 'upstream';
  if (downstream.has(id)) return 'downstream';
  if (lateral.has(id)) return 'lateral';
  if (relevance >= 0.64) return 'lensActive';
  if (relevance >= 0.24) return 'contextual';
  return 'dormant';
}

function realPathEdgeIds(path: string[]) {
  const ids = new Set<string>();
  for (let index = 0; index < path.length - 1; index += 1) {
    const source = path[index];
    const target = path[index + 1];
    const edge = knowledgeGraph.edges.find(
      (candidate) =>
        (candidate.source === source && candidate.target === target) ||
        (candidate.source === target && candidate.target === source),
    );
    if (edge) ids.add(edge.id);
  }
  return ids;
}

export function buildSceneModel(input: SceneModelInput): SceneModel {
  const { goalId, selectedNodeId, hoveredNodeId, learningPath, focused, relationMode = 'primary', learningStates } = input;
  const activeDepth = goalId ? descendants(goalId) : new Map<string, number>();
  const corridor = selectedNodeId ? buildCausalCorridor(selectedNodeId) : null;
  const allUpstreamNodeIds = new Set(corridor?.upstreamNodeDepth.keys() ?? []);
  const allDownstreamNodeIds = new Set(corridor?.downstreamNodeDepth.keys() ?? []);
  const allLateralNodeIds = new Set(corridor?.lateralNodeDistance.keys() ?? []);
  const upstreamNodeIds = relationMode === 'downstream' ? new Set<string>() : allUpstreamNodeIds;
  const downstreamNodeIds = relationMode === 'upstream' ? new Set<string>() : allDownstreamNodeIds;
  const lateralNodeIds = relationMode === 'all' ? allLateralNodeIds : new Set<string>();
  const selectedAncestors = ancestors(selectedNodeId);
  const localNodeIds = oneHop(selectedNodeId);
  selectedAncestors.forEach((id) => localNodeIds.add(id));
  upstreamNodeIds.forEach((id) => localNodeIds.add(id));
  downstreamNodeIds.forEach((id) => localNodeIds.add(id));
  lateralNodeIds.forEach((id) => localNodeIds.add(id));
  const learningPathIds = new Set(learningPath);
  const learningPathEdgeIds = realPathEdgeIds(learningPath);

  const nodes: SceneNode[] = knowledgeGraph.nodes.map((node) => {
    const relevance = relevanceFor(
      node,
      goalId,
      selectedNodeId,
      hoveredNodeId,
      activeDepth,
      localNodeIds,
      learningPathIds,
    );
    const state = visualState(relevance, node.id, selectedNodeId, upstreamNodeIds, downstreamNodeIds, lateralNodeIds, learningPathIds);
    // 选择只改变信息层级与明暗，绝不移动拓扑。这样边不会刷新，用户也不会失去空间记忆。
    const displayPosition = canonicalPosition(node.basePosition);
    const labelVisible =
      node.id === selectedNodeId ||
      node.id === hoveredNodeId ||
      (state === 'lensActive' && ['goal', 'direction', 'course', 'skill'].includes(node.type)) ||
      (localNodeIds.has(node.id) && node.type === 'knowledge');
    const depth = corridor?.upstreamNodeDepth.get(node.id) ?? corridor?.downstreamNodeDepth.get(node.id) ?? 0;
    const direction = upstreamNodeIds.has(node.id) ? 'upstream' : downstreamNodeIds.has(node.id) ? 'downstream' : 'none';
    const propagationDelay = direction === 'upstream'
      ? Math.max(0, (corridor?.maxUpstreamDepth ?? 0) - depth) * 0.055
      : direction === 'downstream' ? depth * 0.065 : 0;
    const luminance = state === 'selected' ? 1 : state === 'upstream' || state === 'downstream' ? 0.86 : state === 'lensActive' ? 0.7 : state === 'contextual' ? 0.34 : 0.18;
    const coreRadius = state === 'selected' ? 0.34 : state === 'upstream' || state === 'downstream' ? 0.25 : state === 'lensActive' ? 0.21 : state === 'contextual' ? 0.17 : 0.125;
    return {
      ...node,
      relevance,
      visualState: state,
      displayPosition,
      labelVisible,
      domainColor: colorForBranch(node.branchId),
      luminance,
      coreRadius,
      haloRadius: Math.min(0.66, 0.2 + luminance * 0.4),
      propagationDelay,
      learningState: learningStates?.get(node.id) ?? 'unknown',
    };
  });

  const activeIds = new Set(nodes.filter((node) => ['lensActive', 'upstream', 'downstream', 'selected'].includes(node.visualState)).map((node) => node.id));
  const selectedPathEdgeIds = corridor?.primaryEdgeIds ?? new Set<string>();

  const edges = knowledgeGraph.edges.map((edge) => {
    let edgeState: EdgeVisualState = 'background';
    let direction: 'none' | 'in' | 'out' = 'none';
    let propagationDelay = 0;
    if (learningPathEdgeIds.has(edge.id)) edgeState = 'path';
    else if (selectedPathEdgeIds.has(edge.id)) {
      const isUpstream = allUpstreamNodeIds.has(edge.source) || allUpstreamNodeIds.has(edge.target);
      const isVisibleInMode = isUpstream
        ? relationMode !== 'downstream'
        : relationMode !== 'upstream';
      if (!isVisibleInMode) return { ...edge, visualState: 'contextual' as const, propagationDelay: 0, direction: 'none' as const };
      edgeState = isUpstream ? 'upstream' : 'downstream';
      direction = isUpstream ? 'in' : 'out';
      const sourceDepth = corridor?.upstreamNodeDepth.get(edge.source) ?? corridor?.downstreamNodeDepth.get(edge.source) ?? 0;
      const targetDepth = corridor?.upstreamNodeDepth.get(edge.target) ?? corridor?.downstreamNodeDepth.get(edge.target) ?? 0;
      const depth = Math.max(sourceDepth, targetDepth);
      propagationDelay = direction === 'in'
        ? Math.max(0, (corridor?.maxUpstreamDepth ?? 0) - depth) * 0.055
        : depth * 0.065;
    } else if (relationMode === 'all' && corridor?.secondaryEdgeIds.has(edge.id)) edgeState = 'lateral';
    else if (activeIds.has(edge.source) && activeIds.has(edge.target)) edgeState = 'lensActive';
    else if (localNodeIds.has(edge.source) || localNodeIds.has(edge.target)) edgeState = 'contextual';
    return { ...edge, visualState: edgeState, propagationDelay, direction };
  });

  return { nodes, edges, selectedPathEdgeIds, learningPathEdgeIds, localNodeIds, upstreamNodeIds, downstreamNodeIds, lateralNodeIds };
}

export function getPathToNode(nodeId: string) {
  const path: KnowledgeNode[] = [];
  let current: KnowledgeNode | undefined = nodesById.get(nodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? nodesById.get(current.parentId) : undefined;
  }
  return path;
}

export function getRelatedNodes(nodeId: string) {
  const ids = new Set<string>();
  for (const edge of knowledgeGraph.edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  }
  return [...ids].map((id) => nodesById.get(id)).filter(Boolean) as KnowledgeNode[];
}

export function getCameraIntent(mode: CameraIntent['mode'], nodeId?: string): CameraIntent {
  return { mode, nodeId, id: `${mode}:${nodeId ?? 'root'}:${Date.now()}` };
}
