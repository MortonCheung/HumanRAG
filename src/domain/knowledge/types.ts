import type { NodeType, RelationType } from '../../graph/types';

export interface KnowledgeLibrary {
  id: string;
  name: string;
  description: string;
  domain: string;
  treeIds: string[];
}

export interface KnowledgeTree {
  id: string;
  libraryId: string;
  name: string;
  description: string;
  color: string;
  ownerType: 'system' | 'user';
  pointIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  kind: NodeType;
  description: string;
  content: string;
  color: string;
  position: [number, number, number];
  difficulty?: '基础' | '进阶' | '挑战';
  estimatedMinutes?: number;
  tags: string[];
  learningObjectives: string[];
  misconceptions: string[];
  recommendedContent: string[];
}

export interface TreeMembership {
  treeId: string;
  pointId: string;
  role: 'root' | 'branch' | 'leaf';
  order?: number;
}

export interface KnowledgeRelation {
  id: string;
  sourcePointId: string;
  targetPointId: string;
  type: RelationType;
}

export type LearningScope =
  | { kind: 'library'; libraryId: string }
  | { kind: 'tree'; libraryId: string; treeId: string }
  | { kind: 'point'; libraryId: string; treeId: string; pointId: string };

export type WorkspaceOrigin =
  | { kind: 'universe'; nodeId: string }
  | { kind: 'tree'; libraryId: string; treeId: string }
  | { kind: 'library'; libraryId: string };

export interface Question {
  id: string;
  pointIds: string[];
  type: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface TeachingUnit {
  id: string;
  pointId: string;
  title: string;
  content: string;
  steps: string[];
}

export interface PointDraft {
  id: string;
  treeId: string;
  name: string;
  kind: KnowledgePoint['kind'];
  description: string;
  content: string;
  color: string;
  difficulty?: KnowledgePoint['difficulty'];
  estimatedMinutes?: number;
  tags: string[];
  learningObjectives: string[];
  misconceptions: string[];
  recommendedContent: string[];
  position?: [number, number, number];
  parentId?: string;
  childIds: string[];
  prerequisiteIds: string[];
  relatedIds: string[];
}

export interface TreeIdentity {
  name: string;
  description: string;
  color: string;
}
