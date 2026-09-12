import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { KnowledgePoint, KnowledgeRelation, KnowledgeTree } from '../../../domain/knowledge/types';
import { layoutCustomTree, type TreePositionMap } from '../../library-builder/customTreeLayout';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { NeuronStar } from '../../../scene/NodePointField';
import { toCustomEdges, toCustomNodes } from '../treeGraphAdapter';
import { TreePreviewEdges } from './TreePreviewEdges';
import { treePreviewRotation, treeRotationPhase } from './treePreviewLayout';

export interface PreviewTreeGraph {
  tree: KnowledgeTree;
  nodes: ReturnType<typeof toCustomNodes>;
  edges: ReturnType<typeof toCustomEdges>;
  positions: TreePositionMap;
  offset: THREE.Vector3;
}

export function buildPreviewTreeGraph(tree: KnowledgeTree, points: KnowledgePoint[], relations: KnowledgeRelation[]): PreviewTreeGraph {
  const pointIds = new Set(points.map((point) => point.id));
  const nodes = toCustomNodes(points).map((node) => ({ ...node, position: undefined }));
  const edges = toCustomEdges(relations, pointIds);
  const positions = layoutCustomTree(nodes, edges);
  return { tree, nodes, edges, positions, offset: customTreeFrame(positions, 1, 1, true).offset };
}

export function PreviewTreeGroup({ graph, anchor, motionAllowed, holdRotation = false }: {
  graph: PreviewTreeGraph;
  anchor: THREE.Vector3;
  motionAllowed: boolean;
  holdRotation?: boolean;
}) {
  const rotation = useRef<THREE.Group>(null);
  const wasHeld = useRef(holdRotation);
  const rotationStartedAt = useRef(0);
  const phase = useMemo(() => treeRotationPhase(graph.tree.id), [graph.tree.id]);

  useFrame(({ clock }) => {
    if (!rotation.current) return;
    if (holdRotation) {
      wasHeld.current = true;
      rotation.current.rotation.y = phase;
      return;
    }
    if (wasHeld.current) {
      wasHeld.current = false;
      rotationStartedAt.current = clock.elapsedTime;
    }
    rotation.current.rotation.y = motionAllowed
      ? treePreviewRotation(graph.tree.id, clock.elapsedTime, rotationStartedAt.current)
      : phase;
  });

  return (
    <group position={anchor} name={`library-preview-tree-${graph.tree.id}`}>
      <group ref={rotation} rotation-y={phase}>
        <group position={graph.offset}>
          <TreePreviewEdges edges={graph.edges} positions={graph.positions} />
          {graph.nodes.map((node) => (
            <group key={node.id} position={graph.positions.get(node.id) ?? [node.x, node.y, node.z ?? 0]}>
              <NeuronStar color={node.color} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
