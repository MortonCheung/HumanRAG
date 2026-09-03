import { create } from 'zustand';
import { explainNode, generatePath } from '../ai/localKnowledgeAI';
import { knowledgeGraph, matchGoal, nodesById } from '../data/knowledgeGraph';
import type { CameraIntent, UserProfile } from '../graph/types';
import type { QualityPreference, ResolvedQualityTier } from '../performance/types';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';

type AppPhase = 'overview' | 'goalFocused' | 'nodeFocused';
type Panel = 'search' | 'lens' | 'atlas' | 'settings' | null;
type RelationMode = 'primary' | 'all' | 'upstream' | 'downstream';
type AsyncStatus = 'idle' | 'loading' | 'success' | 'fallback' | 'error';

interface PersistedState {
  profile: UserProfile | null;
  selectedGoalId: string | null;
  qualityPreference: QualityPreference;
}

interface KnowledgeStore {
  phase: AppPhase;
  profile: UserProfile | null;
  selectedGoalId: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  cameraIntent: CameraIntent;
  activePanel: Panel;
  relationMode: RelationMode;
  selectionEpoch: number;
  isPathRibbonOpen: boolean;
  aiStatusByNode: Record<string, AsyncStatus>;
  explanationByNode: Record<string, string>;
  learningPath: string[];
  learningPathStatus: AsyncStatus;
  unmatchedGoal: boolean;
  qualityPreference: QualityPreference;
  resolvedQualityTier: ResolvedQualityTier;
  submitProfile: (profile: UserProfile) => Promise<void>;
  selectGoal: (goalId: string | null) => void;
  selectNode: (nodeId: string) => void;
  hoverNode: (nodeId: string | null) => void;
  closeNodeDetail: () => void;
  returnOverview: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
  setRelationMode: (mode: RelationMode) => void;
  requestExplanation: (nodeId: string) => Promise<void>;
  generateLearningPath: () => Promise<void>;
  closeLearningPath: () => void;
  setQualityPreference: (preference: QualityPreference) => void;
  setResolvedQualityTier: (tier: ResolvedQualityTier) => void;
  resetKnowledge: () => void;
  prepareUniverseEntry: () => void;
}

function readPersisted(): PersistedState {
  const fallback: PersistedState = { profile: null, selectedGoalId: null, qualityPreference: 'auto' };
  if (typeof window === 'undefined') return fallback;
  const v7 = loadDomain<Partial<PersistedState>>(DOMAIN_KEYS.knowledge);
  if (v7) {
    const qualityPreference = ['auto', 'quality', 'balanced', 'performance'].includes(v7.qualityPreference ?? '')
      ? v7.qualityPreference as QualityPreference
      : 'auto';
    return {
      profile: v7.profile?.major && v7.profile.identity && v7.profile.goal ? v7.profile : null,
      selectedGoalId: v7.selectedGoalId && nodesById.has(v7.selectedGoalId) ? v7.selectedGoalId : null,
      qualityPreference,
    };
  }
  try {
    const raw = localStorage.getItem('knowledge-universe:v4') ?? localStorage.getItem('knowledge-universe:profile:v1');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const selectedGoalId = parsed.selectedGoalId && nodesById.has(parsed.selectedGoalId) ? parsed.selectedGoalId : null;
    const profile = parsed.profile?.major && parsed.profile.identity && parsed.profile.goal ? parsed.profile : null;
    const migrated = { profile, selectedGoalId, qualityPreference: 'auto' as const };
    saveDomain(DOMAIN_KEYS.knowledge, migrated);
    localStorage.removeItem('knowledge-universe:v4');
    localStorage.removeItem('knowledge-universe:profile:v1');
    return migrated;
  } catch {
    return fallback;
  }
}

function persist(profile: UserProfile | null, selectedGoalId: string | null, qualityPreference: QualityPreference) {
  saveDomain(DOMAIN_KEYS.knowledge, { profile, selectedGoalId, qualityPreference });
}

const restored = readPersisted();

function branchRootId(nodeId: string) {
  const node = nodesById.get(nodeId);
  if (!node) return null;
  return knowledgeGraph.nodes.find((candidate) => candidate.type === 'goal' && candidate.branchId === node.branchId)?.id ?? null;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  phase: restored.selectedGoalId ? 'goalFocused' : 'overview',
  profile: restored.profile,
  selectedGoalId: restored.selectedGoalId,
  selectedNodeId: null,
  hoveredNodeId: null,
  cameraIntent: { id: 'overview:initial', mode: 'overview' },
  activePanel: null,
  relationMode: 'primary',
  selectionEpoch: 0,
  isPathRibbonOpen: false,
  aiStatusByNode: {},
  explanationByNode: {},
  learningPath: [],
  learningPathStatus: 'idle',
  unmatchedGoal: false,
  qualityPreference: restored.qualityPreference,
  resolvedQualityTier: restored.qualityPreference === 'auto' ? 'balanced' : restored.qualityPreference,
  submitProfile: async (profile) => {
    const matched = matchGoal(profile.goal);
    set({ profile, unmatchedGoal: !matched.nodeId });
    get().selectGoal(matched.nodeId);
  },
  selectGoal: (goalId) => {
    if (goalId && !nodesById.has(goalId)) return;
    const profile = get().profile;
    persist(profile, goalId, get().qualityPreference);
    set({
      selectedGoalId: goalId,
      selectedNodeId: null,
      activePanel: null,
      isPathRibbonOpen: false,
      unmatchedGoal: false,
      phase: goalId ? 'goalFocused' : 'overview',
      relationMode: 'primary',
      selectionEpoch: get().selectionEpoch + 1,
      cameraIntent: { id: goalId ? `goal:${goalId}:${Date.now()}` : `overview:${Date.now()}`, mode: goalId ? 'goal' : 'overview', nodeId: goalId ?? undefined },
    });
  },
  selectNode: (nodeId) => {
    const node = nodesById.get(nodeId);
    if (!node) return;
    const currentGoalId = get().selectedGoalId;
    const branchFocusId = branchRootId(nodeId);
    const branchChanged = branchFocusId !== currentGoalId;
    const previousNode = get().selectedNodeId ? nodesById.get(get().selectedNodeId!) : null;
    const distance = previousNode
      ? Math.hypot(
        node.basePosition[0] - previousNode.basePosition[0],
        node.basePosition[1] - previousNode.basePosition[1],
        node.basePosition[2] - previousNode.basePosition[2],
      )
      : Number.POSITIVE_INFINITY;
    const shouldMoveCamera = branchChanged || distance > 14;
    if (branchChanged) {
      persist(get().profile, branchFocusId, get().qualityPreference);
    }
    set({
      selectedGoalId: branchFocusId,
      selectedNodeId: nodeId,
      activePanel: null,
      phase: 'nodeFocused',
      selectionEpoch: get().selectionEpoch + 1,
      // 近距离切点保留视角；远距离切点平移镜头，保持用户已调好的方向与缩放。
      cameraIntent: shouldMoveCamera
        ? { id: `node:${nodeId}:${Date.now()}`, mode: 'node', nodeId }
        : get().cameraIntent,
    });
  },
  hoverNode: (nodeId) => set((state) => state.hoveredNodeId === nodeId ? state : { hoveredNodeId: nodeId }),
  closeNodeDetail: () => set((state) => ({
    selectedNodeId: null,
    phase: state.selectedGoalId ? 'goalFocused' : 'overview',
    relationMode: 'primary',
    // 关闭信息面板不改变空间位置；“回到全景”由独立操作明确触发。
    cameraIntent: state.cameraIntent,
  })),
  returnOverview: () => set((state) => {
    persist(state.profile, null, state.qualityPreference);
    return {
      selectedGoalId: null,
      selectedNodeId: null,
      activePanel: null,
      relationMode: 'primary',
      isPathRibbonOpen: false,
      phase: 'overview',
      cameraIntent: { id: `overview:${Date.now()}`, mode: 'overview' },
    };
  }),
  openPanel: (panel) => set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
  closePanel: () => set({ activePanel: null }),
  setRelationMode: (relationMode) => set({ relationMode }),
  requestExplanation: async (nodeId) => {
    set((state) => ({ aiStatusByNode: { ...state.aiStatusByNode, [nodeId]: 'loading' } }));
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 260));
      const result = explainNode(nodeId, get().profile);
      set((state) => ({
        aiStatusByNode: { ...state.aiStatusByNode, [nodeId]: 'fallback' },
        explanationByNode: { ...state.explanationByNode, [nodeId]: result },
      }));
    } catch {
      set((state) => ({ aiStatusByNode: { ...state.aiStatusByNode, [nodeId]: 'error' } }));
    }
  },
  generateLearningPath: async () => {
    set({ learningPathStatus: 'loading' });
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    set({ learningPath: generatePath(get().selectedGoalId), isPathRibbonOpen: true, learningPathStatus: 'fallback' });
  },
  closeLearningPath: () => set({ isPathRibbonOpen: false }),
  setQualityPreference: (qualityPreference) => set((state) => {
    persist(state.profile, state.selectedGoalId, qualityPreference);
    return {
      qualityPreference,
      resolvedQualityTier: qualityPreference === 'auto' ? state.resolvedQualityTier : qualityPreference,
    };
  }),
  setResolvedQualityTier: (resolvedQualityTier) => set((state) => state.qualityPreference === 'auto' ? { resolvedQualityTier } : state),
  resetKnowledge: () => {
    removeDomain(DOMAIN_KEYS.knowledge);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('knowledge-universe:v4');
      localStorage.removeItem('knowledge-universe:profile:v1');
    }
    set({
      phase: 'overview',
      profile: null,
      selectedGoalId: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      cameraIntent: { id: `overview:reset:${Date.now()}`, mode: 'overview' },
      activePanel: null,
      relationMode: 'primary',
      isPathRibbonOpen: false,
      qualityPreference: 'auto',
      resolvedQualityTier: 'balanced',
    });
  },
  prepareUniverseEntry: () => set((state) => {
    persist(state.profile, null, state.qualityPreference);
    return {
      phase: 'overview',
      selectedGoalId: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      activePanel: null,
      relationMode: 'primary',
      isPathRibbonOpen: false,
      learningPath: [],
      unmatchedGoal: false,
      selectionEpoch: state.selectionEpoch + 1,
      cameraIntent: { id: `entry:${Date.now()}`, mode: 'overview' },
    };
  }),
}));
