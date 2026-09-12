import { CameraControls, CameraControlsImpl, Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GoalTreeDraft } from '../../../ai/knowledge-tree/GoalTreeComposer';
import { getRegistry } from '../../../domain/knowledge/selectors';
import type { KnowledgePoint } from '../../../domain/knowledge/types';
import type { SceneModel } from '../../../graph/types';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { layoutCustomTree, type TreePositionMap } from '../../library-builder/customTreeLayout';
import { TreePreviewEdges, treeEdgeBuildShader } from '../../library/scene/TreePreviewEdges';
import { treePreviewAnchor, treeRotationPhase } from '../../library/scene/treePreviewLayout';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';
import { EXTRACTION_PHASES, extractionPhaseDurationMs, extractionProgress, useGoalTreeTransitionStore, type ExtractionPhase } from './goalTreeTransitionStore';

export interface GoalTreeExtractionLayout {
  positions: TreePositionMap;
  centeredPositions: TreePositionMap;
  worldPositions: TreePositionMap;
  edges: ReturnType<typeof toCustomEdges>;
  anchor: THREE.Vector3;
  rotation: number;
}

export function buildGoalTreeExtractionLayout(draft: GoalTreeDraft, treeId?: string | null): GoalTreeExtractionLayout {
  const registry = getRegistry();
  const pointIds = new Set(draft.pointIds);
  const points = draft.pointIds.map((id) => registry.points.get(id)).filter((point): point is KnowledgePoint => Boolean(point));
  const nodes = toCustomNodes(points).map((node) => ({ ...node, position: undefined }));
  const edges = toCustomEdges(registry.relations, pointIds);
  const positions = layoutCustomTree(nodes, edges);
  const offset = customTreeFrame(positions, 1, 1, true).offset;
  const tree = treeId ? registry.trees.get(treeId) : undefined;
  const library = tree ? registry.libraries.get(tree.libraryId) : undefined;
  const treeIndex = tree && library ? library.treeIds.indexOf(tree.id) : -1;
  const anchor = treeIndex >= 0 ? treePreviewAnchor(treeIndex) : new THREE.Vector3();
  const rotation = tree ? treeRotationPhase(tree.id) : 0;
  const centeredPositions: TreePositionMap = new Map([...positions].map(([id, position]) => [
    id,
    [position[0] + offset.x, position[1] + offset.y, position[2] + offset.z] as [number, number, number],
  ]));
  const worldPositions: TreePositionMap = new Map([...centeredPositions].map(([id, position]) => {
    const world = new THREE.Vector3(...position).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation).add(anchor);
    return [id, world.toArray() as [number, number, number]];
  }));
  return { positions, centeredPositions, worldPositions, edges, anchor, rotation };
}

export { treeEdgeBuildShader };

export function GoalTreeExtraction({ model, layout, motionAllowed }: {
  model: SceneModel;
  layout: GoalTreeExtractionLayout;
  motionAllowed: boolean;
}) {
  const phase = useGoalTreeTransitionStore((state) => state.phase);
  const phaseStartedAt = useGoalTreeTransitionStore((state) => state.phaseStartedAt);
  const draft = useGoalTreeTransitionStore((state) => state.draft);
  const advance = useGoalTreeTransitionStore((state) => state.advance);
  const markVisualReady = useGoalTreeTransitionStore((state) => state.markVisualReady);
  const { invalidate } = useThree();

  useEffect(() => {
    if (!draft) return;
    const index = EXTRACTION_PHASES.indexOf(phase);
    if (index < 0) return;
    const timer = window.setTimeout(() => {
      const next = EXTRACTION_PHASES[index + 1];
      if (next) advance(next);
      else {
        advance('ready');
        markVisualReady();
      }
      invalidate();
    }, extractionPhaseDurationMs(phase, motionAllowed));
    return () => window.clearTimeout(timer);
  }, [advance, draft, invalidate, markVisualReady, motionAllowed, phase]);

  useEffect(() => {
    if (!draft || phase === 'idle' || phase === 'handoff') return;
    const timer = window.setInterval(invalidate, 1000 / 60);
    return () => window.clearInterval(timer);
  }, [draft, invalidate, phase]);

  if (!draft || phase === 'idle') return null;
  const showLabels = phase === 'highlighting' || phase === 'detaching' || phase === 'receding';
  return <>
    <GoalTreeExtractionCamera layout={layout} phase={phase} motionAllowed={motionAllowed} />
    <GoalTreeBuildingEdges layout={layout} phase={phase} phaseStartedAt={phaseStartedAt} motionAllowed={motionAllowed} />
    {showLabels && draft.pointIds.slice(0, 4).map((id) => {
      const node = model.nodes.find((candidate) => candidate.id === id);
      if (!node) return null;
      return <group key={id} position={node.displayPosition}>
        <Html position={[0, 1.55, 0]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
          <span className="node-label node-label--selected">{node.name}</span>
        </Html>
      </group>;
    })}
  </>;
}

function GoalTreeExtractionCamera({ layout, phase, motionAllowed }: {
  layout: GoalTreeExtractionLayout;
  phase: ExtractionPhase;
  motionAllowed: boolean;
}) {
  const controls = useRef<CameraControlsImpl>(null);
  const fromPosition = useRef(new THREE.Vector3());
  const fromTarget = useRef(new THREE.Vector3());
  const toPosition = useRef(new THREE.Vector3());
  const toTarget = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3());
  const phaseStartedAt = useGoalTreeTransitionStore((state) => state.phaseStartedAt);
  const { camera, invalidate, size } = useThree();
  useEffect(() => {
    if (!controls.current || phase !== 'forming') return;
    const pose = customTreeFrame(layout.positions, size.width, size.height, true);
    pose.position.add(layout.anchor);
    pose.target.add(layout.anchor);
    fromPosition.current.copy(camera.position);
    controls.current.getTarget(fromTarget.current);
    toPosition.current.copy(pose.position);
    toTarget.current.copy(pose.target);
    invalidate();
  }, [camera.position, invalidate, layout.anchor, layout.positions, phase, size.height, size.width]);
  useFrame(() => {
    if (!controls.current || !['forming', 'connecting', 'ready', 'handoff'].includes(phase)) return;
    const progress = phase === 'forming' ? extractionProgress(phase, phaseStartedAt, motionAllowed) : 1;
    currentPosition.current.lerpVectors(fromPosition.current, toPosition.current, progress);
    currentTarget.current.lerpVectors(fromTarget.current, toTarget.current, progress);
    const position = currentPosition.current;
    const target = currentTarget.current;
    void controls.current.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);
  });
  return <CameraControls ref={controls} makeDefault enabled={false} smoothTime={0} />;
}

function GoalTreeBuildingEdges({ layout, phase, phaseStartedAt, motionAllowed }: {
  layout: GoalTreeExtractionLayout;
  phase: ExtractionPhase;
  phaseStartedAt: number;
  motionAllowed: boolean;
}) {
  if (phase !== 'connecting' && phase !== 'ready' && phase !== 'handoff') return null;
  return <group position={layout.anchor} rotation-y={layout.rotation}>
    <TreePreviewEdges
      edges={layout.edges}
      positions={layout.centeredPositions}
      getBuild={() => phase === 'connecting' ? extractionProgress(phase, phaseStartedAt, motionAllowed) : 1}
    />
  </group>;
}
