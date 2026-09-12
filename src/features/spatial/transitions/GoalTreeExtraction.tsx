import { CameraControls, CameraControlsImpl, Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GoalTreeDraft } from '../../../ai/knowledge-tree/GoalTreeComposer';
import { getRegistry } from '../../../domain/knowledge/selectors';
import type { KnowledgePoint } from '../../../domain/knowledge/types';
import type { SceneModel } from '../../../graph/types';
import { QUALITY_CONFIG } from '../../../performance/qualityPolicy';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { buildEdgeGeometry } from '../../../scene/BatchedKnowledgeEdges';
import { customTreeFrame } from '../../library-builder/customTreeFraming';
import { layoutCustomTree, type TreePositionMap } from '../../library-builder/customTreeLayout';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';
import { EXTRACTION_PHASES, extractionPhaseDurationMs, extractionProgress, useGoalTreeTransitionStore, type ExtractionPhase } from './goalTreeTransitionStore';

export interface GoalTreeExtractionLayout {
  positions: TreePositionMap;
  worldPositions: TreePositionMap;
}

export function buildGoalTreeExtractionLayout(draft: GoalTreeDraft): GoalTreeExtractionLayout {
  const registry = getRegistry();
  const pointIds = new Set(draft.pointIds);
  const points = draft.pointIds.map((id) => registry.points.get(id)).filter((point): point is KnowledgePoint => Boolean(point));
  const nodes = toCustomNodes(points).map((node) => ({ ...node, position: undefined }));
  const edges = toCustomEdges(registry.relations, pointIds);
  const positions = layoutCustomTree(nodes, edges);
  const offset = customTreeFrame(positions, 1, 1, true).offset;
  const worldPositions: TreePositionMap = new Map([...positions].map(([id, position]) => [
    id,
    [position[0] + offset.x, position[1] + offset.y, position[2] + offset.z] as [number, number, number],
  ]));
  return { positions, worldPositions };
}

export const treeEdgeBuildShader = `
  uniform float uBuild;
  varying float vProgress;
  void main() {
    float distanceToEnd=min(vProgress,1.0-vProgress)*2.0;
    float visible=1.0-smoothstep(uBuild,uBuild+0.08,distanceToEnd);
    vec3 color=mix(vec3(0.43,0.62,0.75),vec3(0.78,0.91,1.0),visible*0.35);
    gl_FragColor=vec4(color,0.52*visible);
  }
`;

const treeEdgeVertexShader = `
  attribute float aProgress;
  varying float vProgress;
  void main() {
    vProgress=aProgress;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;

function buildFinalSceneModel(model: SceneModel, draft: GoalTreeDraft, layout: GoalTreeExtractionLayout): SceneModel {
  const selected = new Set(draft.pointIds);
  return {
    ...model,
    nodes: model.nodes
      .filter((node) => selected.has(node.id))
      .map((node) => ({ ...node, displayPosition: layout.worldPositions.get(node.id) ?? node.displayPosition })),
    edges: model.edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target)),
  };
}

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
  const finalModel = buildFinalSceneModel(model, draft, layout);
  const showLabels = phase === 'highlighting' || phase === 'detaching' || phase === 'receding';
  return <>
    <GoalTreeExtractionCamera layout={layout} phase={phase} motionAllowed={motionAllowed} />
    <GoalTreeBuildingEdges model={finalModel} phase={phase} phaseStartedAt={phaseStartedAt} motionAllowed={motionAllowed} />
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
  const { invalidate, size } = useThree();
  useEffect(() => {
    if (!controls.current || phase !== 'forming') return;
    const pose = customTreeFrame(layout.positions, size.width, size.height, true);
    void controls.current.setLookAt(...pose.position.toArray(), ...pose.target.toArray(), motionAllowed);
    invalidate();
  }, [invalidate, layout.positions, motionAllowed, phase, size.height, size.width]);
  return <CameraControls ref={controls} makeDefault enabled={false} smoothTime={motionAllowed ? 0.3 : 0} />;
}

function GoalTreeBuildingEdges({ model, phase, phaseStartedAt, motionAllowed }: {
  model: SceneModel;
  phase: ExtractionPhase;
  phaseStartedAt: number;
  motionAllowed: boolean;
}) {
  const quality = useKnowledgeStore((state) => state.resolvedQualityTier);
  const geometry = useMemo(() => buildEdgeGeometry(model, QUALITY_CONFIG[quality].curveSegments), [model, quality]);
  const uniforms = useMemo(() => ({ uBuild: { value: 0 } }), []);
  useFrame(() => {
    if (phase === 'connecting') {
      const progress = extractionProgress(phase, phaseStartedAt, motionAllowed);
      uniforms.uBuild.value = progress;
    } else if (phase === 'ready' || phase === 'handoff') {
      uniforms.uBuild.value = 1;
    } else {
      uniforms.uBuild.value = 0;
    }
  });
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <lineSegments geometry={geometry} raycast={() => null} visible={phase === 'connecting' || phase === 'ready' || phase === 'handoff'}>
    <shaderMaterial vertexShader={treeEdgeVertexShader} fragmentShader={treeEdgeBuildShader} uniforms={uniforms}
      transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </lineSegments>;
}
