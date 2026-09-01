import type { CustomEdge, CustomNode } from '../../store/libraryStore';

export type TreePositionMap = Map<string, [number, number, number]>;

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(result);
}

/** 为旧草稿和未手工放置的节点生成稳定的分层三维树布局。 */
export function layoutCustomTree(nodes: CustomNode[], edges: CustomEdge[]): TreePositionMap {
  const result: TreePositionMap = new Map();
  nodes.forEach((node) => {
    if (node.position) result.set(node.id, [...node.position]);
  });

  const hierarchy = edges.filter((edge) => edge.relationType === 'hierarchy');
  const incoming = new Set(hierarchy.map((edge) => edge.target));
  const roots = nodes.filter((node) => !incoming.has(node.id));
  const depth = new Map<string, number>();
  const queue = roots.map((node) => ({ id: node.id, depth: 0 }));
  while (queue.length) {
    const current = queue.shift()!;
    if (depth.has(current.id)) continue;
    depth.set(current.id, current.depth);
    hierarchy.filter((edge) => edge.source === current.id).forEach((edge) => queue.push({ id: edge.target, depth: current.depth + 1 }));
  }
  nodes.forEach((node) => { if (!depth.has(node.id)) depth.set(node.id, Math.max(1, node.layer ?? 2)); });

  const byDepth = new Map<number, CustomNode[]>();
  nodes.forEach((node) => {
    const level = depth.get(node.id) ?? 0;
    byDepth.set(level, [...(byDepth.get(level) ?? []), node]);
  });

  byDepth.forEach((levelNodes, level) => {
    levelNodes.forEach((node, index) => {
      if (result.has(node.id)) return;
      if (level === 0) {
        const rootOffset = (index - (levelNodes.length - 1) / 2) * 5;
        result.set(node.id, [rootOffset, 8, 0]);
        return;
      }
      const angle = (index / Math.max(1, levelNodes.length)) * Math.PI * 2 + (hash(node.id) % 31) / 100;
      const radius = 4.6 + level * 2.4 + (index % 2) * 0.7;
      result.set(node.id, [
        Number((Math.cos(angle) * radius).toFixed(2)),
        Number((8 - level * 5.2).toFixed(2)),
        Number((Math.sin(angle) * radius).toFixed(2)),
      ]);
    });
  });
  return result;
}
