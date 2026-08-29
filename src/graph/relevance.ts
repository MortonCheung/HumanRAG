import { knowledgeGraph, nodesById } from '../data/knowledgeGraph';
import type {
  CameraIntent,
  EdgeVisualState,
  KnowledgeNode,
  SceneModel,
  SceneNode,
  VisualState,
} from './types';

const BRANCH_ANCHORS: Record<string, [number, number]> = {
  '408': [-16, -8],
  ai: [16, -8],
  game: [-16, 12],
  frontend: [16, 12],
};

export interface SceneModelInput {
  goalId: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  learningPath: string[];
  focused: boolean;
}

function descendants(seedId: string) {
  const depth = new Map<string, number>([[seedId, 0]]);
  const queue = [seedId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of knowledgeGraph.edges) {
      if (edge.source !== current || edge.relationType !== 'hierarchy' || depth.has(edge.target)) continue;
      depth.set(edge.target, (depth.get(current) ?? 0) + 1);
      queue.push(edge.target);
    }
  }
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
  for (const edge of knowledgeGraph.edges) {
    if (edge.source === seedId) ids.add(edge.target);
    if (edge.target === seedId) ids.add(edge.source);
  }
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

  const adjacentToActive = knowledgeGraph.edges.some(
    (edge) =>
      (edge.source === node.id && activeDepth.has(edge.target)) ||
      (edge.target === node.id && activeDepth.has(edge.source)),
  );
  return adjacentToActive ? 0.28 : 0.055;
}

function visualState(relevance: number, selected: boolean): VisualState {
  if (selected) return 'selected';
  if (relevance >= 0.64) return 'active';
  if (relevance >= 0.24) return 'contextual';
  return 'inactive';
}

function getFocusPosition(node: KnowledgeNode, relevance: number, goalId: string | null): [number, number, number] {
  const base = node.basePosition;
  if (!goalId) return [...base] as [number, number, number];
  const activeNode = nodesById.get(goalId);
  const activeAnchor = activeNode ? BRANCH_ANCHORS[activeNode.branchId] : undefined;
  const nodeAnchor = BRANCH_ANCHORS[node.branchId];
  if (!activeAnchor || !nodeAnchor) return [...base] as [number, number, number];

  if (node.branchId === activeNode?.branchId) {
    const compression = relevance >= 0.64 ? 1.08 : 1.16;
    return [
      activeAnchor[0] + (base[0] - nodeAnchor[0]) * compression,
      base[1],
      activeAnchor[1] + (base[2] - nodeAnchor[1]) * compression,
    ];
  }

  const awayX = nodeAnchor[0] - activeAnchor[0];
  const awayZ = nodeAnchor[1] - activeAnchor[1];
  const length = Math.hypot(awayX, awayZ) || 1;
  const push = relevance >= 0.24 ? 2.2 : 5.5;
  return [base[0] + (awayX / length) * push, base[1], base[2] + (awayZ / length) * push];
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
  const { goalId, selectedNodeId, hoveredNodeId, learningPath, focused } = input;
  const activeDepth = goalId ? descendants(goalId) : new Map<string, number>();
  const selectedAncestors = ancestors(selectedNodeId);
  const localNodeIds = oneHop(selectedNodeId);
  selectedAncestors.forEach((id) => localNodeIds.add(id));
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
    const state = visualState(relevance, selectedNodeId === node.id);
    const displayPosition = focused
      ? getFocusPosition(node, relevance, goalId)
      : ([...node.basePosition] as [number, number, number]);
    const labelVisible =
      node.id === selectedNodeId ||
      node.id === hoveredNodeId ||
      (state === 'active' && ['goal', 'direction', 'course', 'skill'].includes(node.type)) ||
      (localNodeIds.has(node.id) && node.type === 'knowledge');
    return { ...node, relevance, visualState: state, displayPosition, labelVisible };
  });

  const activeIds = new Set(nodes.filter((node) => node.visualState === 'active' || node.visualState === 'selected').map((node) => node.id));
  const selectedPathEdgeIds = new Set<string>();
  if (selectedNodeId) {
    let current = nodesById.get(selectedNodeId);
    while (current?.parentId) {
      const edge = knowledgeGraph.edges.find(
        (candidate) =>
          candidate.relationType === 'hierarchy' &&
          candidate.source === current?.parentId &&
          candidate.target === current.id,
      );
      if (edge) selectedPathEdgeIds.add(edge.id);
      current = nodesById.get(current.parentId);
    }
  }

  const edges = knowledgeGraph.edges.map((edge) => {
    let edgeState: EdgeVisualState = 'background';
    if (learningPathEdgeIds.has(edge.id) || selectedPathEdgeIds.has(edge.id)) edgeState = 'path';
    else if (activeIds.has(edge.source) && activeIds.has(edge.target)) edgeState = 'active';
    else if (localNodeIds.has(edge.source) || localNodeIds.has(edge.target)) edgeState = 'contextual';
    return { ...edge, visualState: edgeState };
  });

  return { nodes, edges, selectedPathEdgeIds, learningPathEdgeIds, localNodeIds };
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
