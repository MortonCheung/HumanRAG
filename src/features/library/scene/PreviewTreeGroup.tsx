import { QuadraticBezierLine } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { KnowledgePoint, KnowledgeRelation, KnowledgeTree } from '../../../domain/knowledge/types';
import { layoutCustomTree, type TreePositionMap } from '../../library-builder/customTreeLayout';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { NeuronStar } from '../../../scene/NodePointField';
import { toCustomEdges, toCustomNodes } from '../treeGraphAdapter';
import { treeRotationPhase } from './treePreviewLayout';

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

export function PreviewTreeGroup({ graph, anchor, motionAllowed }: {
  graph: PreviewTreeGraph;
  anchor: THREE.Vector3;
  motionAllowed: boolean;
}) {
  const rotation = useRef<THREE.Group>(null);
  const phase = useMemo(() => treeRotationPhase(graph.tree.id), [graph.tree.id]);
  const curves = useMemo(() => graph.edges.map((edge) => {
    const start = graph.positions.get(edge.source);
    const end = graph.positions.get(edge.target);
    if (!start || !end) return null;
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const mid = a.clone().lerp(b, 0.5);
    mid.z += Math.min(2.8, a.distanceTo(b) * 0.16) * (edge.relationType === 'related' ? -1 : 1);
    return { edge, start: a, end: b, mid };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)), [graph.edges, graph.positions]);

  useFrame(({ clock }) => {
    if (!rotation.current) return;
    rotation.current.rotation.y = phase + (motionAllowed ? clock.elapsedTime * 0.075 : 0);
  });

  return (
    <group position={anchor} name={`library-preview-tree-${graph.tree.id}`}>
      <group ref={rotation} position={graph.offset} rotation-y={phase}>
        {curves.map(({ edge, start, end, mid }) => (
          <QuadraticBezierLine
            key={edge.id}
            start={start}
            end={end}
            mid={mid}
            color={edge.relationType === 'hierarchy' ? '#a5c9ec' : '#809fc1'}
            transparent
            opacity={0.28}
            lineWidth={0.72}
          />
        ))}
        {graph.nodes.map((node) => (
          <group key={node.id} position={graph.positions.get(node.id) ?? [node.x, node.y, node.z ?? 0]}>
            <NeuronStar color={node.color} />
          </group>
        ))}
      </group>
    </group>
  );
}
