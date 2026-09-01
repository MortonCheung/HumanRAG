import type { KnowledgeNode, KnowledgeEdge } from '../../graph/types';
import type { KnowledgePoint, KnowledgeTree, KnowledgeRelation, TreeMembership } from './types';
import { BRANCH_TO_TREE_ID } from './catalog';

const NODE_KIND_MAP: Record<string, KnowledgePoint['kind']> = {
  goal: 'course',
  direction: 'course',
  course: 'course',
  skill: 'course',
  knowledge: 'knowledge',
  practice: 'practice',
};

export function adaptNodeToPoint(node: KnowledgeNode): KnowledgePoint {
  return {
    id: node.id,
    name: node.name,
    kind: NODE_KIND_MAP[node.type] ?? 'knowledge',
    description: node.description,
    content: node.description,
    color: '#8b7355',
    position: node.basePosition,
    tags: node.keywords,
    learningObjectives: [],
    misconceptions: [],
    recommendedContent: node.recommendedContent,
  };
}

export function adaptEdgeToRelation(edge: KnowledgeEdge): KnowledgeRelation {
  return {
    id: edge.id,
    sourcePointId: edge.source,
    targetPointId: edge.target,
    type: edge.relationType,
  };
}

export function buildTreeMemberships(nodes: KnowledgeNode[]): TreeMembership[] {
  const memberships: TreeMembership[] = [];
  for (const node of nodes) {
    const treeId = BRANCH_TO_TREE_ID[node.branchId];
    const role = node.type === 'goal' ? 'root' : node.type === 'practice' ? 'leaf' : 'branch';
    memberships.push({ treeId, pointId: node.id, role });
  }
  return memberships;
}

export function populateTreePointIds(trees: KnowledgeTree[], nodes: KnowledgeNode[]): KnowledgeTree[] {
  const treeMap = new Map(trees.map((t) => [t.id, { ...t }]));
  for (const node of nodes) {
    const treeId = BRANCH_TO_TREE_ID[node.branchId];
    const tree = treeMap.get(treeId);
    if (tree) tree.pointIds.push(node.id);
  }
  return Array.from(treeMap.values());
}
