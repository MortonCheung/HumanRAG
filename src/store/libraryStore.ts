import { create } from 'zustand';
import { hashString, SeededRandom } from '../data/v6/generators/seededRandom';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';
import type { TeachingStep, TeachingUnit } from '../data/v6/schemas/teachingSchema';
import type { Question } from '../data/v6/schemas/questionSchema';

/**
 * 知识库唯一来源（蓝图 §17.2）：用户自定义知识库列表与编辑草稿。
 * 系统知识库与大学模板只读，来自 catalog，不复制到 store。
 * 自定义库持久化到 iteach:v6:libraries。
 */

export type CustomNodeKind = 'course' | 'topic' | 'knowledge';
export type CustomRelationType = 'hierarchy' | 'prerequisite' | 'related' | 'practice_for';

export interface CustomNode {
  id: string;
  name: string;
  kind: CustomNodeKind;
  description: string;
  x: number;
  y: number;
  z?: number;
  /** 三维编辑器的权威坐标；x/y 保留用于兼容既有草稿。 */
  position?: [number, number, number];
  /** 下列属性参考属性图模型，并补充教学系统真正需要的元数据。 */
  domain?: string;
  color?: string;
  layer?: number;
  difficulty?: '基础' | '进阶' | '挑战';
  estimatedMinutes?: number;
  tags?: string[];
  content?: string;
  learningObjectives?: string[];
  misconceptions?: string[];
  recommendedContent?: string[];
}

export interface CustomEdge {
  id: string;
  source: string;
  target: string;
  relationType: CustomRelationType;
}

export interface UserLibrary {
  id: string;
  name: string;
  description: string;
  domain: string;
  ownerType: 'user';
  nodes: CustomNode[];
  edges: CustomEdge[];
  sourceIds: string[];
  teachingUnitIds: string[];
  questionIds: string[];
  /** 完整自定义内容（蓝图 §14.2）：不能只保存 id，必须保存完整教学单元、步骤与题目。 */
  teachingUnits: TeachingUnit[];
  teachingSteps: TeachingStep[];
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface LibraryDraft extends UserLibrary {
  status: 'draft' | 'published';
}

interface LibraryState {
  userLibraries: UserLibrary[];
  draft: LibraryDraft | null;
  createDraft: (name: string) => void;
  loadDraftFromLibrary: (libraryId: string) => void;
  updateDraft: (patch: Partial<LibraryDraft>) => void;
  addNode: (node: CustomNode) => void;
  updateNode: (id: string, patch: Partial<CustomNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: CustomEdge) => void;
  commitNodeBundle: (node: CustomNode, edges: CustomEdge[]) => void;
  commitNodePosition: (id: string, position: [number, number, number]) => void;
  removeEdge: (id: string) => void;
  publishDraft: () => string | null;
  deleteLibrary: (id: string) => void;
  resetDraft: () => void;
  resetAll: () => void;
}

const persisted = loadDomain<UserLibrary[]>(DOMAIN_KEYS.libraries);
const persistedDraft = loadDomain<LibraryDraft>(DOMAIN_KEYS.libraryDraft);
let draftSequence = 0;

function stableId(prefix: string, seed: string): string {
  return `${prefix}-${hashString(seed).toString(36).slice(0, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function emptyDraft(name: string): LibraryDraft {
  draftSequence += 1;
  return {
    // 名称不是唯一键；时间戳和进程内序号避免同名知识库覆盖旧库。
    id: stableId('lib', `${name}:${Date.now()}:${draftSequence}`),
    name,
    description: '',
    domain: '自定义',
    ownerType: 'user',
    nodes: [],
    edges: [],
    sourceIds: [],
    teachingUnitIds: [],
    questionIds: [],
    teachingUnits: [],
    teachingSteps: [],
    questions: [],
    createdAt: now(),
    updatedAt: now(),
    status: 'draft',
  };
}

/** 旧版本只保存 id，未保存完整内容；读取时补齐为空数组，避免运行时报错。 */
function normalizeLibrary(library: UserLibrary): UserLibrary {
  return {
    ...library,
    teachingUnits: library.teachingUnits ?? [],
    teachingSteps: library.teachingSteps ?? [],
    questions: library.questions ?? [],
  };
}

function persistDraft(draft: LibraryDraft | null): void {
  if (draft) saveDomain(DOMAIN_KEYS.libraryDraft, draft);
  else removeDomain(DOMAIN_KEYS.libraryDraft);
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  userLibraries: (persisted ?? []).map(normalizeLibrary),
  draft: persistedDraft ?? null,

  createDraft: (name) => {
    const draft = emptyDraft(name);
    persistDraft(draft);
    set({ draft });
  },

  loadDraftFromLibrary: (libraryId) => {
    const library = get().userLibraries.find((entry) => entry.id === libraryId);
    if (library) {
      const draft = { ...library, status: 'draft' as const };
      persistDraft(draft);
      set({ draft });
    }
  },

  updateDraft: (patch) => {
    const draft = get().draft;
    if (!draft) return;
    const next = { ...draft, ...patch, updatedAt: now() };
    persistDraft(next);
    set({ draft: next });
  },

  addNode: (node) => {
    const draft = get().draft;
    if (!draft) return;
    const next = { ...draft, nodes: [...draft.nodes, node], updatedAt: now() };
    persistDraft(next);
    set({ draft: next });
  },

  updateNode: (id, patch) => {
    const draft = get().draft;
    if (!draft) return;
    const next = {
      ...draft,
      nodes: draft.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
      updatedAt: now(),
    };
    persistDraft(next);
    set({ draft: next });
  },

  removeNode: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const next = {
      ...draft,
      nodes: draft.nodes.filter((node) => node.id !== id),
      edges: draft.edges.filter((edge) => edge.source !== id && edge.target !== id),
      updatedAt: now(),
    };
    persistDraft(next);
    set({ draft: next });
  },

  addEdge: (edge) => {
    const draft = get().draft;
    if (!draft) return;
    if (draft.edges.some((entry) => entry.source === edge.source && entry.target === edge.target)) return;
    const next = { ...draft, edges: [...draft.edges, edge], updatedAt: now() };
    persistDraft(next);
    set({ draft: next });
  },

  commitNodeBundle: (node, edges) => {
    const draft = get().draft;
    if (!draft) return;
    const existingKeys = new Set(draft.edges.map((edge) => `${edge.source}:${edge.target}:${edge.relationType}`));
    const uniqueEdges = edges.filter((edge) => {
      const key = `${edge.source}:${edge.target}:${edge.relationType}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    const next = {
      ...draft,
      nodes: [...draft.nodes, node],
      edges: [...draft.edges, ...uniqueEdges],
      updatedAt: now(),
    };
    persistDraft(next);
    set({ draft: next });
  },

  commitNodePosition: (id, position) => {
    const draft = get().draft;
    if (!draft) return;
    const next = {
      ...draft,
      nodes: draft.nodes.map((node) => node.id === id ? {
        ...node,
        position,
        x: position[0],
        y: position[1],
        z: position[2],
      } : node),
      updatedAt: now(),
    };
    persistDraft(next);
    set({ draft: next });
  },

  removeEdge: (id) => {
    const draft = get().draft;
    if (!draft) return;
    const next = { ...draft, edges: draft.edges.filter((edge) => edge.id !== id), updatedAt: now() };
    persistDraft(next);
    set({ draft: next });
  },

  publishDraft: () => {
    const draft = get().draft;
    if (!draft || draft.nodes.length === 0) return null;
    const published: UserLibrary = {
      id: draft.id,
      name: draft.name,
      description: draft.description,
      domain: draft.domain,
      ownerType: 'user',
      nodes: draft.nodes,
      edges: draft.edges,
      sourceIds: draft.sourceIds,
      teachingUnitIds: draft.teachingUnitIds,
      questionIds: draft.questionIds,
      teachingUnits: draft.teachingUnits,
      teachingSteps: draft.teachingSteps,
      questions: draft.questions,
      createdAt: draft.createdAt,
      updatedAt: now(),
    };
    const existing = get().userLibraries.some((entry) => entry.id === published.id);
    const next = existing
      ? get().userLibraries.map((entry) => (entry.id === published.id ? published : entry))
      : [...get().userLibraries, published];
    saveDomain(DOMAIN_KEYS.libraries, next);
    const publishedDraft = { ...draft, status: 'published' as const };
    persistDraft(publishedDraft);
    set({ userLibraries: next, draft: publishedDraft });
    return published.id;
  },

  deleteLibrary: (id) => {
    const next = get().userLibraries.filter((entry) => entry.id !== id);
    saveDomain(DOMAIN_KEYS.libraries, next);
    set({ userLibraries: next });
  },

  resetDraft: () => {
    removeDomain(DOMAIN_KEYS.libraryDraft);
    set({ draft: null });
  },

  resetAll: () => {
    removeDomain(DOMAIN_KEYS.libraries);
    removeDomain(DOMAIN_KEYS.libraryDraft);
    set({ userLibraries: [], draft: null });
  },
}));

/** 为自定义知识库确定性生成一套节点布局，供「选择模板」入口使用。 */
export function generateDraftNodes(name: string, topicCount: number): CustomNode[] {
  const rng = new SeededRandom(`custom-${name}`);
  const root: CustomNode = {
    id: stableId('cnode', `${name}:root`),
    name,
    kind: 'course',
    description: `「${name}」的知识结构根节点。`,
    x: 0,
    y: 0,
    z: 0,
    position: [0, 8, 0],
  };
  const nodes: CustomNode[] = [root];
  for (let index = 1; index <= topicCount; index += 1) {
    const angle = (index / topicCount) * Math.PI * 2;
    const radius = 4 + (index % 3) * 2;
    nodes.push({
      id: stableId('cnode', `${name}:${index}`),
      name: `主题 ${index}`,
      kind: 'topic',
      description: `「${name}」的第 ${index} 个主题。`,
      x: Number((Math.cos(angle) * radius + rng.float() * 2 - 1).toFixed(2)),
      y: Number((Math.sin(angle) * radius + rng.float() * 2 - 1).toFixed(2)),
      z: Number((Math.sin(angle) * radius).toFixed(2)),
      position: [
        Number((Math.cos(angle) * radius + rng.float() * 2 - 1).toFixed(2)),
        2,
        Number((Math.sin(angle) * radius).toFixed(2)),
      ],
    });
  }
  return nodes;
}
