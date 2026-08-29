import type { KnowledgeGraphData, NodeType } from './types';

const expectedLayers: Record<NodeType, number[]> = {
  goal: [20],
  direction: [10],
  skill: [0],
  course: [0],
  knowledge: [-10],
  practice: [-20],
};

export function validateKnowledgeGraph(graph: KnowledgeGraphData) {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const edgeSignatures = new Set<string>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push(`重复节点: ${node.id}`);
    nodeIds.add(node.id);
    if (!expectedLayers[node.type].includes(node.layer)) errors.push(`节点层级不匹配: ${node.id}`);
    if (node.parentId === node.id) errors.push(`节点不能指向自身父级: ${node.id}`);
  }

  for (const edge of graph.edges) {
    const signature = `${edge.source}:${edge.target}:${edge.relationType}`;
    if (edgeIds.has(edge.id)) errors.push(`重复边 ID: ${edge.id}`);
    if (edgeSignatures.has(signature)) errors.push(`重复边: ${signature}`);
    edgeIds.add(edge.id);
    edgeSignatures.add(signature);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) errors.push(`悬空边: ${edge.id}`);
    if (edge.source === edge.target) errors.push(`自连接边: ${edge.id}`);
  }

  const prerequisiteAdjacency = new Map<string, string[]>();
  for (const edge of graph.edges.filter((item) => item.relationType === 'prerequisite')) {
    prerequisiteAdjacency.set(edge.source, [...(prerequisiteAdjacency.get(edge.source) ?? []), edge.target]);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const target of prerequisiteAdjacency.get(nodeId) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };
  for (const nodeId of nodeIds) {
    if (visit(nodeId)) {
      errors.push('前置知识关系存在循环');
      break;
    }
  }

  return errors;
}
