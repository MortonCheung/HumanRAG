import { create } from 'zustand';
import { explainNode, generatePath } from '../ai/localKnowledgeAI';
import { matchGoal, nodesById } from '../data/knowledgeGraph';
import type { CameraIntent, UserProfile } from '../graph/types';

type AppPhase = 'onboarding' | 'enteringUniverse' | 'overview' | 'goalFocused' | 'nodeFocused';

interface KnowledgeStore {
  phase: AppPhase;
  profile: UserProfile | null;
  selectedGoalId: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  cameraIntent: CameraIntent;
  isPathRibbonOpen: boolean;
  aiStatus: 'idle' | 'loading' | 'success' | 'fallback';
  explanationByNode: Record<string, string>;
  learningPath: string[];
  unmatchedGoal: boolean;
  submitProfile: (profile: UserProfile) => Promise<void>;
  selectGoal: (goalId: string) => void;
  selectNode: (nodeId: string) => void;
  hoverNode: (nodeId: string | null) => void;
  closeNodeDetail: () => void;
  returnOverview: () => void;
  openOnboarding: () => void;
  requestExplanation: (nodeId: string) => Promise<void>;
  generateLearningPath: () => Promise<void>;
  closeLearningPath: () => void;
}

const readPersisted = (): { profile: UserProfile; selectedGoalId: string | null } | null => {
  try {
    const raw = localStorage.getItem('knowledge-universe:profile:v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; profile?: UserProfile; selectedGoalId?: string | null };
    if (parsed.version !== 1 || !parsed.profile || !parsed.profile.major || !parsed.profile.identity || !parsed.profile.goal) return null;
    if (parsed.selectedGoalId && !nodesById.has(parsed.selectedGoalId)) return null;
    return { profile: parsed.profile, selectedGoalId: parsed.selectedGoalId ?? null };
  } catch {
    return null;
  }
};

const persisted = typeof window !== 'undefined' ? readPersisted() : null;

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  phase: persisted?.profile ? 'overview' : 'onboarding',
  profile: persisted?.profile ?? null,
  selectedGoalId: persisted?.selectedGoalId ?? null,
  selectedNodeId: null,
  hoveredNodeId: null,
  cameraIntent: { id: 'overview:initial', mode: 'overview' },
  isPathRibbonOpen: false,
  aiStatus: 'idle',
  explanationByNode: {},
  learningPath: [],
  unmatchedGoal: false,
  submitProfile: async (profile) => {
    const matched = matchGoal(profile.goal);
    try {
      localStorage.setItem('knowledge-universe:profile:v1', JSON.stringify({ version: 1, profile, selectedGoalId: matched.nodeId }));
    } catch {
      // local state remains usable when storage is unavailable.
    }
    if (matched.nodeId) {
      set({ profile, selectedGoalId: matched.nodeId, unmatchedGoal: false, selectedNodeId: null, phase: 'enteringUniverse', cameraIntent: { id: `goal:${matched.nodeId}:${Date.now()}`, mode: 'goal', nodeId: matched.nodeId } });
      window.setTimeout(() => set((state) => state.phase === 'enteringUniverse' ? { phase: 'goalFocused' } : state), 850);
    } else {
      set({ profile, selectedGoalId: null, unmatchedGoal: true, selectedNodeId: null, phase: 'overview', cameraIntent: { id: `overview:${Date.now()}`, mode: 'overview' } });
    }
  },
  selectGoal: (goalId) => {
    if (!nodesById.has(goalId)) return;
    const profile = get().profile;
    if (profile) {
      try { localStorage.setItem('knowledge-universe:profile:v1', JSON.stringify({ version: 1, profile, selectedGoalId: goalId })); } catch { /* no-op */ }
    }
    set({ selectedGoalId: goalId, selectedNodeId: null, isPathRibbonOpen: false, unmatchedGoal: false, phase: 'goalFocused', cameraIntent: { id: `goal:${goalId}:${Date.now()}`, mode: 'goal', nodeId: goalId } });
  },
  selectNode: (nodeId) => {
    if (!nodesById.has(nodeId)) return;
    set({ selectedNodeId: nodeId, phase: 'nodeFocused', cameraIntent: { id: `node:${nodeId}:${Date.now()}`, mode: 'node', nodeId } });
  },
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  closeNodeDetail: () => set((state) => ({ selectedNodeId: null, phase: state.selectedGoalId ? 'goalFocused' : 'overview', cameraIntent: { id: `return:${Date.now()}`, mode: state.selectedGoalId ? 'goal' : 'overview', nodeId: state.selectedGoalId ?? undefined } })),
  returnOverview: () => set({ selectedNodeId: null, selectedGoalId: null, isPathRibbonOpen: false, unmatchedGoal: false, phase: 'overview', cameraIntent: { id: `overview:${Date.now()}`, mode: 'overview' } }),
  openOnboarding: () => set({ phase: 'onboarding' }),
  requestExplanation: async (nodeId) => {
    set({ aiStatus: 'loading' });
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    const result = explainNode(nodeId, get().profile);
    set((state) => ({ aiStatus: 'fallback', explanationByNode: { ...state.explanationByNode, [nodeId]: result } }));
  },
  generateLearningPath: async () => {
    set({ aiStatus: 'loading' });
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    set({ learningPath: generatePath(get().selectedGoalId), isPathRibbonOpen: true, aiStatus: 'fallback' });
  },
  closeLearningPath: () => set({ isPathRibbonOpen: false }),
}));
