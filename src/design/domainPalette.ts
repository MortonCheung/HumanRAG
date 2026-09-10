import type { BranchId } from '../graph/types';

export const DOMAIN_COLORS: Record<BranchId, string> = {
  '408': '#b5ddff',
  ai: '#b4f1ee',
  game: '#ddd8ff',
  frontend: '#c0cff7',
};

export const HOT_CORE = '#f0fbff';
export const CHAIN_GOLD = '#c5efff';

export function colorForBranch(branchId: BranchId) {
  return DOMAIN_COLORS[branchId];
}
