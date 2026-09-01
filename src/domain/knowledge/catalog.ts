import type { BranchId } from '../../graph/types';
import type { KnowledgeLibrary, KnowledgeTree } from './types';

const BRANCH_TO_TREE: Record<BranchId, { id: string; name: string; color: string }> = {
  '408': { id: 'tree-408', name: '考研408', color: '#c97b5f' },
  ai: { id: 'tree-ai', name: 'AI工程', color: '#5f9ea0' },
  game: { id: 'tree-game', name: '游戏开发', color: '#8b7355' },
  frontend: { id: 'tree-frontend', name: '前端开发', color: '#7d8c5c' },
};

export const TREE_ID_TO_BRANCH: Record<string, BranchId> = Object.fromEntries(
  Object.entries(BRANCH_TO_TREE).map(([branchId, config]) => [config.id, branchId as BranchId]),
);

export const BRANCH_TO_TREE_ID: Record<BranchId, string> = Object.fromEntries(
  Object.entries(BRANCH_TO_TREE).map(([branchId, config]) => [branchId as BranchId, config.id]),
) as Record<BranchId, string>;

export function createSystemTrees(): KnowledgeTree[] {
  const now = new Date().toISOString();
  return Object.entries(BRANCH_TO_TREE).map(([branchId, config]) => ({
    id: config.id,
    libraryId: 'computer',
    name: config.name,
    description: `${config.name}方向的完整知识体系`,
    color: config.color,
    ownerType: 'system' as const,
    pointIds: [],
    createdAt: now,
    updatedAt: now,
  }));
}

export function createComputerLibrary(trees: KnowledgeTree[]): KnowledgeLibrary {
  return {
    id: 'computer',
    name: '计算机科学',
    description: '计算机科学领域的完整知识库，包含考研408、AI工程、游戏开发、前端开发四个方向',
    domain: 'computer-science',
    treeIds: trees.map((t) => t.id),
  };
}

export const COMPUTER_LIBRARY_ID = 'computer';
export const SYSTEM_TREE_IDS = Object.values(BRANCH_TO_TREE).map((t) => t.id);
