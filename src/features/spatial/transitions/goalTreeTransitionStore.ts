import { create } from 'zustand';
import type { GoalTreeDraft } from '../../../ai/knowledge-tree/GoalTreeComposer';

export type ExtractionPhase = 'idle' | 'highlighting' | 'detaching' | 'receding' | 'forming' | 'connecting' | 'ready' | 'handoff';

interface GoalTreeTransitionState {
  phase: ExtractionPhase;
  phaseStartedAt: number;
  draft: GoalTreeDraft | null;
  treeId: string | null;
  treeReady: boolean;
  visualReady: boolean;
  error: string | null;
  begin: (draft: GoalTreeDraft) => void;
  advance: (phase: ExtractionPhase) => void;
  markTreeReady: (treeId: string) => void;
  markVisualReady: () => void;
  startHandoff: () => void;
  fail: (error: string) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as const,
  phaseStartedAt: 0,
  draft: null,
  treeId: null,
  treeReady: false,
  visualReady: false,
  error: null,
};

export function canStartGoalTreeHandoff(state: Pick<GoalTreeTransitionState, 'phase' | 'treeReady' | 'visualReady' | 'treeId'>): boolean {
  return state.phase === 'ready' && state.treeReady && state.visualReady && Boolean(state.treeId);
}

export const EXTRACTION_PHASES: ExtractionPhase[] = ['highlighting', 'detaching', 'receding', 'forming', 'connecting'];

export function extractionPhaseDurationMs(phase: ExtractionPhase, motionAllowed: boolean): number {
  if (!motionAllowed) return phase === 'forming' ? 80 : 45;
  return {
    highlighting: 820,
    detaching: 360,
    receding: 320,
    forming: 620,
    connecting: 420,
    idle: 0,
    ready: 0,
    handoff: 0,
  }[phase];
}

export function extractionProgress(phase: ExtractionPhase, phaseStartedAt: number, motionAllowed: boolean, now = Date.now()): number {
  const duration = extractionPhaseDurationMs(phase, motionAllowed);
  if (duration <= 0) return phase === 'idle' ? 0 : 1;
  const linear = Math.max(0, Math.min(1, (now - phaseStartedAt) / duration));
  return linear * linear * (3 - 2 * linear);
}

export const useGoalTreeTransitionStore = create<GoalTreeTransitionState>((set) => ({
  ...initialState,
  begin: (draft) => set({ ...initialState, phase: 'highlighting', phaseStartedAt: Date.now(), draft }),
  advance: (phase) => set((state) => state.phase === 'idle' || state.phase === 'handoff' ? state : { ...state, phase, phaseStartedAt: Date.now() }),
  markTreeReady: (treeId) => set({ treeId, treeReady: true }),
  markVisualReady: () => set({ visualReady: true }),
  startHandoff: () => set((state) => ({ ...state, phase: 'handoff', phaseStartedAt: Date.now() })),
  fail: (error) => set({ ...initialState, error }),
  reset: () => set(initialState),
}));
