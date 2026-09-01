import type { BranchId } from '../graph/types';

export const DOMAIN_COLORS: Record<BranchId, string> = {
  '408': '#d8c58f',
  ai: '#84abb0',
  game: '#b28b82',
  frontend: '#8998b8',
};

export const HOT_CORE = '#fff8dc';
export const CHAIN_GOLD = '#e6bf67';

export function colorForBranch(branchId: BranchId) {
  return DOMAIN_COLORS[branchId];
}
