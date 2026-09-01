import { MultiDirectedGraph } from 'graphology';
import { knowledgeGraph, nodesById } from '../data/knowledgeGraph';
import type { KnowledgeEdge, KnowledgeNode } from './types';

export class GraphRepository {
  readonly graph = new MultiDirectedGraph();
  readonly nodeById = nodesById;
  readonly edgeById = new Map<string, KnowledgeEdge>(knowledgeGraph.edges.map((edge) => [edge.id, edge]));
  readonly nodeIndexById = new Map(knowledgeGraph.nodes.map((node, index) => [node.id, index]));
  private readonly incomingByNode = new Map<string, KnowledgeEdge[]>();
  private readonly outgoingByNode = new Map<string, KnowledgeEdge[]>();
  private readonly adjacentByNode = new Map<string, KnowledgeEdge[]>();

  constructor() {
    for (const node of knowledgeGraph.nodes) {
      this.graph.addNode(node.id, node);
      this.incomingByNode.set(node.id, []);
      this.outgoingByNode.set(node.id, []);
      this.adjacentByNode.set(node.id, []);
    }
    for (const edge of knowledgeGraph.edges) {
      this.graph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, edge);
      this.incomingByNode.get(edge.target)?.push(edge);
      this.outgoingByNode.get(edge.source)?.push(edge);
      this.adjacentByNode.get(edge.source)?.push(edge);
      this.adjacentByNode.get(edge.target)?.push(edge);
    }
  }

  hasNode(id: string) { return this.nodeById.has(id); }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodeById.get(id);
  }

  incoming(id: string, types?: KnowledgeEdge['relationType'][]): KnowledgeEdge[] {
    const edges = this.incomingByNode.get(id) ?? [];
    return types ? edges.filter((edge) => types.includes(edge.relationType)) : edges;
  }

  outgoing(id: string, types?: KnowledgeEdge['relationType'][]): KnowledgeEdge[] {
    const edges = this.outgoingByNode.get(id) ?? [];
    return types ? edges.filter((edge) => types.includes(edge.relationType)) : edges;
  }

  adjacent(id: string) { return this.adjacentByNode.get(id) ?? []; }
}

export const graphRepository = new GraphRepository();
