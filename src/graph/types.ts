export type NodeType = 'goal' | 'direction' | 'skill' | 'course' | 'knowledge' | 'practice';
export type RelationType = 'hierarchy' | 'prerequisite' | 'related' | 'practice_for';
export type BranchId = '408' | 'ai' | 'game' | 'frontend';

export type Layer = 20 | 10 | 0 | -10 | -20;

export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  layer: Layer;
  branchId: BranchId;
  description: string;
  keywords: string[];
  recommendedContent: string[];
  basePosition: [number, number, number];
  parentId?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface UserProfile {
  major: string;
  identity: string;
  goal: string;
}

export interface GoalMatchResult {
  status: 'matched' | 'unmatched';
  nodeId: string | null;
  confidence: number;
  matchedAlias?: string;
}

export interface CameraIntent {
  id: string;
  mode: 'overview' | 'goal' | 'node';
  nodeId?: string;
}

export type VisualState = 'dormant' | 'contextual' | 'lensActive' | 'upstream' | 'downstream' | 'lateral' | 'selected' | 'recommendedPath' | 'searchMatch';
export type EdgeVisualState = 'background' | 'contextual' | 'lensActive' | 'upstream' | 'downstream' | 'lateral' | 'path';

export interface SceneNode extends KnowledgeNode {
  displayPosition: [number, number, number];
  relevance: number;
  visualState: VisualState;
  labelVisible: boolean;
  domainColor: string;
  luminance: number;
  coreRadius: number;
  haloRadius: number;
  propagationDelay: number;
}

export interface SceneEdge extends KnowledgeEdge {
  visualState: EdgeVisualState;
  propagationDelay: number;
  direction: 'none' | 'in' | 'out';
}

export interface SceneModel {
  nodes: SceneNode[];
  edges: SceneEdge[];
  selectedPathEdgeIds: Set<string>;
  learningPathEdgeIds: Set<string>;
  localNodeIds: Set<string>;
  upstreamNodeIds: Set<string>;
  downstreamNodeIds: Set<string>;
  lateralNodeIds: Set<string>;
}
