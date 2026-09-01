import type { KnowledgeEdge } from './types';
import { graphRepository } from './GraphRepository';

export interface CausalCorridor {
  focusNodeId: string;
  upstreamNodeDepth: Map<string, number>;
  downstreamNodeDepth: Map<string, number>;
  lateralNodeDistance: Map<string, number>;
  primaryEdgeIds: Set<string>;
  secondaryEdgeIds: Set<string>;
  maxUpstreamDepth: number;
  maxDownstreamDepth: number;
}

const upstreamTypes = new Set<KnowledgeEdge['relationType']>(['prerequisite', 'hierarchy']);
const downstreamTypes = new Set<KnowledgeEdge['relationType']>(['prerequisite', 'hierarchy', 'practice_for']);

function walk(
  start: string,
  direction: 'incoming' | 'outgoing',
  allowed: Set<KnowledgeEdge['relationType']>,
  maxDepth: number,
) {
  const depth = new Map<string, number>([[start, 0]]);
  const edges = new Set<string>();
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current) ?? 0;
    if (currentDepth >= maxDepth) continue;
    const candidates = direction === 'incoming'
      ? graphRepository.incoming(current, [...allowed])
      : graphRepository.outgoing(current, [...allowed]);
    for (const edge of candidates) {
      const next = direction === 'incoming' ? edge.source : edge.target;
      edges.add(edge.id);
      const nextDepth = currentDepth + 1;
      if (!depth.has(next) || nextDepth < (depth.get(next) ?? Number.POSITIVE_INFINITY)) {
        depth.set(next, nextDepth);
        queue.push(next);
      }
    }
  }
  depth.delete(start);
  return { depth, edges };
}

export function buildCausalCorridor(focusNodeId: string, maxDepth = 6): CausalCorridor {
  const upstream = walk(focusNodeId, 'incoming', upstreamTypes, maxDepth);
  const downstream = walk(focusNodeId, 'outgoing', downstreamTypes, maxDepth);
  const lateralNodeDistance = new Map<string, number>();
  const secondaryEdgeIds = new Set<string>();

  for (const edge of [...graphRepository.edgeById.values()]) {
    if (edge.relationType !== 'related') continue;
    if (edge.source === focusNodeId) {
      lateralNodeDistance.set(edge.target, 1);
      secondaryEdgeIds.add(edge.id);
    }
    if (edge.target === focusNodeId) {
      lateralNodeDistance.set(edge.source, 1);
      secondaryEdgeIds.add(edge.id);
    }
  }

  const primaryEdgeIds = new Set([...upstream.edges, ...downstream.edges]);
  const maxUpstreamDepth = Math.max(0, ...upstream.depth.values());
  const maxDownstreamDepth = Math.max(0, ...downstream.depth.values());
  return {
    focusNodeId,
    upstreamNodeDepth: upstream.depth,
    downstreamNodeDepth: downstream.depth,
    lateralNodeDistance,
    primaryEdgeIds,
    secondaryEdgeIds,
    maxUpstreamDepth,
    maxDownstreamDepth,
  };
}
