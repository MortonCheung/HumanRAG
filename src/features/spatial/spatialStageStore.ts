import { create } from 'zustand';

export type SpatialStageMode = 'intro' | 'universe' | 'library' | 'tree';

interface SpatialStageState {
  mode: SpatialStageMode;
  selectedTreeId: string | null;
  setMode: (mode: SpatialStageMode) => void;
  selectTree: (treeId: string | null) => void;
}

export const useSpatialStageStore = create<SpatialStageState>((set) => ({
  mode: 'intro',
  selectedTreeId: null,
  setMode: (mode) => set({ mode }),
  selectTree: (selectedTreeId) => set({ selectedTreeId }),
}));
