import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { KnowledgePoint, KnowledgeRelation, KnowledgeTree } from '../../../domain/knowledge/types';
import { canonicalPositionMap } from '../../../graph/canonicalSpace';
import { layoutCustomTree, type TreePositionMap } from '../../library-builder/customTreeLayout';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { NeuronStar } from '../../../scene/NodePointField';
import { toCustomEdges, toCustomNodes } from '../treeGraphAdapter';
import { TreePreviewEdges } from './TreePreviewEdges';
import { TREE_PREVIEW_ROTATION_SPEED, treePreviewRotation, treeRotationPhase } from './treePreviewLayout';
import type { LearningState } from '../../../domain/learning/deriveLearningState';

export interface PreviewTreeGraph {
  tree: KnowledgeTree;
  nodes: ReturnType<typeof toCustomNodes>;
  edges: ReturnType<typeof toCustomEdges>;
  positions: TreePositionMap;
  offset: THREE.Vector3;
}

export function buildPreviewTreeGraph(tree: KnowledgeTree, points: KnowledgePoint[], relations: KnowledgeRelation[]): PreviewTreeGraph {
  const pointIds = new Set(points.map((point) => point.id));
  const nodes = toCustomNodes(points);
  const edges = toCustomEdges(relations, pointIds);
  // System tree = Universe canonical topology；只有 user tree 允许重新布局。
  const positions = tree.ownerType === 'system'
    ? canonicalPositionMap(points)
    : layoutCustomTree(
        nodes.map((node) => ({ ...node, position: undefined })),
        edges,
      );
  return { tree, nodes, edges, positions, offset: customTreeFrame(positions, 1, 1, true).offset };
}

export function PreviewTreeGroup({ graph, anchor, motionAllowed, holdRotation = false, autoRotate = true, interactive = false,
  reportRotation = false, selectedPointId = null, hoveredPointId = null, onSelectPoint, onHoverPoint, learningStates }: {
  graph: PreviewTreeGraph;
  anchor: THREE.Vector3;
  motionAllowed: boolean;
  holdRotation?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  reportRotation?: boolean;
  selectedPointId?: string | null;
  hoveredPointId?: string | null;
  onSelectPoint?: (pointId: string) => void;
  onHoverPoint?: (pointId: string | null) => void;
  learningStates?: ReadonlyMap<string, LearningState>;
}) {
  const rotation = useRef<THREE.Group>(null);
  const wasHeld = useRef(holdRotation);
  const initialized = useRef(false);
  const rotationStartedAt = useRef(0);
  const rotationMotion = useRef({ weight: autoRotate ? 1 : 0 });
  const { gl, invalidate } = useThree();
  const phase = useMemo(() => treeRotationPhase(graph.tree.id), [graph.tree.id]);

  useEffect(() => {
    const tween = gsap.to(rotationMotion.current, {
      weight: autoRotate && motionAllowed ? 1 : 0,
      duration: motionAllowed ? 0.45 : 0,
      ease: 'power2.out',
      onUpdate: invalidate,
    });
    return () => { tween.kill(); };
  }, [autoRotate, invalidate, motionAllowed]);

  useEffect(() => () => {
    if (reportRotation) delete gl.domElement.dataset.previewTreeRotation;
  }, [gl.domElement, reportRotation]);

  useFrame(({ clock }, delta) => {
    if (!rotation.current) return;
    if (holdRotation) {
      wasHeld.current = true;
      initialized.current = true;
      rotationStartedAt.current = clock.elapsedTime;
      rotation.current.rotation.y = phase;
      if (reportRotation) gl.domElement.dataset.previewTreeRotation = phase.toFixed(5);
      return;
    }
    if (!initialized.current) {
      initialized.current = true;
      rotationStartedAt.current = clock.elapsedTime;
      rotation.current.rotation.y = autoRotate && motionAllowed
        ? treePreviewRotation(graph.tree.id, clock.elapsedTime)
        : phase;
      if (reportRotation) gl.domElement.dataset.previewTreeRotation = rotation.current.rotation.y.toFixed(5);
      return;
    }
    if (wasHeld.current) {
      wasHeld.current = false;
      rotationStartedAt.current = clock.elapsedTime;
    }
    if (motionAllowed && rotationMotion.current.weight > 0.001) {
      rotation.current.rotation.y += Math.min(delta, 0.05) * TREE_PREVIEW_ROTATION_SPEED * rotationMotion.current.weight;
    }
    if (reportRotation) gl.domElement.dataset.previewTreeRotation = rotation.current.rotation.y.toFixed(5);
  });

  return (
    <group position={anchor} name={`library-preview-tree-${graph.tree.id}`}>
      <group ref={rotation} rotation-y={phase}>
        <group position={graph.offset}>
          <TreePreviewEdges edges={graph.edges} positions={graph.positions} />
          {graph.nodes.map((node) => (
            <group key={node.id} position={graph.positions.get(node.id) ?? [node.x, node.y, node.z ?? 0]}>
              <NeuronStar color={node.color} selected={node.id === selectedPointId || node.id === hoveredPointId} learningState={learningStates?.get(node.id)} />
              {interactive && <mesh
                onPointerOver={(event) => { event.stopPropagation(); onHoverPoint?.(node.id); }}
                onPointerOut={(event) => { event.stopPropagation(); onHoverPoint?.(null); }}
                onClick={(event) => { event.stopPropagation(); onSelectPoint?.(node.id); }}
              >
                <sphereGeometry args={[0.58, 10, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>}
              {(node.id === selectedPointId || node.id === hoveredPointId) && <Html center position={[0, -0.78, 0]} className="custom-tree-node-label" style={{ pointerEvents: 'none' }}><span>{node.name}</span></Html>}
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
