import type { KnowledgeGraphData, SceneModel } from '../../graph/types';

export interface ConstellationPreset {
  id: string;
  points: Array<[number, number, number]>;
}

export const CONSTELLATION_PRESETS: ConstellationPreset[] = [
  { id: 'orion-inspired', points: [[-4.6, 3.4, 0], [3.8, 3.8, 0], [-1.4, .8, 0], [0, .3, 0], [1.4, -.2, 0], [-3.6, -3.4, 0], [4.3, -3.6, 0]] },
  { id: 'dipper-inspired', points: [[-5, 1.8, 0], [-3, .7, 0], [-1, .4, 0], [1, -.3, 0], [2.8, .2, 0], [4, 1.8, 0], [5.3, .6, 0]] },
  { id: 'cassiopeia-inspired', points: [[-5, 1, 0], [-2.6, -1.3, 0], [0, 1.7, 0], [2.7, -1.1, 0], [5, 1.2, 0]] },
];

export function pickIntroSubgraph(preset: ConstellationPreset, graph: KnowledgeGraphData, seedId: string) {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), edge.source]);
  }
  const selected: string[] = [];
  const queue = [seedId];
  const seen = new Set<string>();
  for (let cursor = 0; cursor < queue.length && selected.length < preset.points.length; cursor += 1) {
    const id = queue[cursor];
    if (seen.has(id) || !graph.nodes.some((node) => node.id === id)) continue;
    seen.add(id);
    selected.push(id);
    for (const next of adjacency.get(id) ?? []) if (!seen.has(next)) queue.push(next);
  }
  const ids = new Set(selected);
  return { nodeIds: selected, edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
}

export function buildConstellationScene(model: SceneModel, preset: ConstellationPreset, seedId: string): SceneModel {
  const graph: KnowledgeGraphData = { nodes: model.nodes, edges: model.edges };
  const subgraph = pickIntroSubgraph(preset, graph, seedId);
  const ids = new Set(subgraph.nodeIds);
  const positions = new Map(subgraph.nodeIds.map((id, index) => [id, preset.points[index]]));
  return {
    ...model,
    nodes: model.nodes.filter((node) => ids.has(node.id)).map((node) => ({
      ...node,
      displayPosition: positions.get(node.id) ?? node.displayPosition,
      visualState: 'lensActive' as const,
      relevance: 1,
      labelVisible: false,
      propagationDelay: 0,
    })),
    edges: model.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge) => ({ ...edge, visualState: 'lensActive' as const, propagationDelay: 0 })),
  };
}

/** Breadth-first graph distance drives both line growth and the receiving node reveal. */
export function withAwakeningDelays(model: SceneModel, seedIds: readonly string[]): SceneModel {
  const adjacency = new Map<string, Array<{ id: string; edgeId: string }>>();
  for (const edge of model.edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), { id: edge.target, edgeId: edge.id }]);
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), { id: edge.source, edgeId: edge.id }]);
  }
  const depth = new Map(seedIds.map((id) => [id, 0]));
  const edgeDepth = new Map<string, number>();
  const queue = [...seedIds];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const nextDepth = (depth.get(current) ?? 0) + 1;
    for (const next of adjacency.get(current) ?? []) {
      edgeDepth.set(next.edgeId, Math.min(edgeDepth.get(next.edgeId) ?? Infinity, nextDepth));
      if (depth.has(next.id)) continue;
      depth.set(next.id, nextDepth);
      queue.push(next.id);
    }
  }
  return {
    ...model,
    nodes: model.nodes.map((node) => ({ ...node, propagationDelay: (depth.get(node.id) ?? 12) * .14 })),
    edges: model.edges.map((edge) => ({ ...edge, propagationDelay: Math.max(0, (edgeDepth.get(edge.id) ?? 12) - 1) * .14 })),
  };
}
