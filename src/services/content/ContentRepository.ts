import type { KnowledgeEdge, KnowledgeNode } from '../../graph/types';
import type { Question } from '../../data/v6/schemas/questionSchema';
import type { TeachingStep, TeachingUnit } from '../../data/v6/schemas/teachingSchema';
import {
  TEACHING_STEPS_BY_ID,
  TEACHING_UNITS_BY_ID,
  TEACHING_UNITS_BY_NODE_ID,
} from '../../data/v6/generators/generateTeachingUnit';
import {
  getQuestion as getSystemQuestion,
  questionIdsForNode,
} from '../../data/v6/generators/generateQuestionVariants';
import { knowledgeGraph } from '../../data/knowledgeGraph';
import { useLibraryStore, type CustomEdge, type CustomNode } from '../../store/libraryStore';

/**
 * 统一内容 Repository（蓝图 §14.1）：系统静态内容与用户自定义内容共用同一套读取接口。
 * 读取顺序：系统静态内容 → 当前用户已发布知识库 → undefined / []。
 */

export interface ContentRepository {
  getTeachingUnit(unitId: string): TeachingUnit | undefined;
  getTeachingStep(stepId: string): TeachingStep | undefined;
  getQuestion(questionId: string): Question | undefined;
  getQuestionsForNode(nodeId: string): Question[];
  getLibraryNodes(libraryId: string): KnowledgeNode[];
  getLibraryEdges(libraryId: string): KnowledgeEdge[];
}

function userLibraries() {
  return useLibraryStore.getState().userLibraries;
}

function toKnowledgeNode(node: CustomNode): KnowledgeNode {
  return {
    id: node.id,
    name: node.name,
    type: node.kind === 'course' ? 'course' : node.kind === 'knowledge' ? 'knowledge' : 'skill',
    layer: 0,
    branchId: 'ai',
    description: node.description,
    keywords: node.tags ?? [],
    recommendedContent: node.recommendedContent ?? [],
    basePosition: node.position ?? [node.x, node.y, node.z ?? 0],
  };
}

function toKnowledgeEdge(edge: CustomEdge): KnowledgeEdge {
  return { id: edge.id, source: edge.source, target: edge.target, relationType: edge.relationType };
}

export const contentRepository: ContentRepository & {
  getNode(nodeId: string): KnowledgeNode | undefined;
  getTeachingUnitForNode(nodeId: string): TeachingUnit | undefined;
} = {
  getTeachingUnit(unitId) {
    const system = TEACHING_UNITS_BY_ID.get(unitId);
    if (system) return system;
    for (const library of userLibraries()) {
      const unit = library.teachingUnits.find((entry) => entry.id === unitId);
      if (unit) return unit;
    }
    return undefined;
  },

  getTeachingStep(stepId) {
    const system = TEACHING_STEPS_BY_ID.get(stepId);
    if (system) return system;
    for (const library of userLibraries()) {
      const step = library.teachingSteps.find((entry) => entry.id === stepId);
      if (step) return step;
    }
    return undefined;
  },

  getQuestion(questionId) {
    const system = getSystemQuestion(questionId);
    if (system) return system;
    for (const library of userLibraries()) {
      const question = library.questions.find((entry) => entry.id === questionId);
      if (question) return question;
    }
    return undefined;
  },

  getQuestionsForNode(nodeId) {
    const systemIds = questionIdsForNode(nodeId);
    if (systemIds.length > 0) {
      return systemIds
        .map((id) => getSystemQuestion(id))
        .filter((question): question is Question => question !== undefined);
    }
    for (const library of userLibraries()) {
      const questions = library.questions.filter((entry) => entry.nodeIds.includes(nodeId));
      if (questions.length > 0) return questions;
    }
    return [];
  },

  getLibraryNodes(libraryId) {
    const library = userLibraries().find((entry) => entry.id === libraryId);
    return library ? library.nodes.map(toKnowledgeNode) : [];
  },

  getLibraryEdges(libraryId) {
    const library = userLibraries().find((entry) => entry.id === libraryId);
    return library ? library.edges.map(toKnowledgeEdge) : [];
  },

  getNode(nodeId) {
    const system = knowledgeGraph.nodes.find((node) => node.id === nodeId);
    if (system) return system;
    for (const library of userLibraries()) {
      const node = library.nodes.find((entry) => entry.id === nodeId);
      if (node) return toKnowledgeNode(node);
    }
    return undefined;
  },

  getTeachingUnitForNode(nodeId) {
    const system = TEACHING_UNITS_BY_NODE_ID.get(nodeId);
    if (system) return system;
    for (const library of userLibraries()) {
      const unit = library.teachingUnits.find((entry) => entry.nodeId === nodeId);
      if (unit) return unit;
    }
    return undefined;
  },
};
