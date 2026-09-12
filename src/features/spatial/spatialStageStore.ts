import { create } from 'zustand';

export type SpatialStageMode = 'intro' | 'universe' | 'library' | 'tree';

interface SpatialStageState {
  mode: SpatialStageMode;
  selectedTreeId: string | null;
  selectedTreePointId: string | null;
  hoveredTreePointId: string | null;
  setMode: (mode: SpatialStageMode) => void;
  selectTree: (treeId: string | null) => void;
  selectTreePoint: (pointId: string | null) => void;
  hoverTreePoint: (pointId: string | null) => void;
}

export const useSpatialStageStore = create<SpatialStageState>((set) => ({
  mode: 'intro',
  selectedTreeId: null,
  selectedTreePointId: null,
  hoveredTreePointId: null,
  setMode: (mode) => set((state) => ({
    mode,
    ...(mode === 'tree' ? {} : { selectedTreePointId: null, hoveredTreePointId: null }),
    ...(state.mode === mode ? {} : { hoveredTreePointId: null }),
  })),
  selectTree: (selectedTreeId) => set((state) => ({
    selectedTreeId,
    ...(state.selectedTreeId === selectedTreeId ? {} : { selectedTreePointId: null, hoveredTreePointId: null }),
  })),
  selectTreePoint: (selectedTreePointId) => set({ selectedTreePointId, hoveredTreePointId: null }),
  hoverTreePoint: (hoveredTreePointId) => set({ hoveredTreePointId }),
}));
