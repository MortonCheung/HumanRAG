import { create } from 'zustand';
import { AI_SUBMISSION_COOLDOWN_MS, type ChatMessage } from '../../ai/chat/contracts';
import { sendChat } from '../../ai/chat/chatClient';
import { speakText } from '../../ai/speech/speechClient';
import type { PicoConversationItem, PicoState } from './picoTypes';
import { defaultPromptForExplicitContext, explicitContextExcerpt } from './askPrompts';

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

function reaction(motion: PicoState['motion'], face?: PicoState['face']) {
  return (state: PicoState) => ({
    ...(face ? { face } : {}),
    motion,
    motionNonce: state.motionNonce + 1,
  });
}

function settleReaction(nonce: number, delay = 900) {
  window.setTimeout(() => {
    const current = usePicoStore.getState();
    if (current.motionNonce !== nonce) return;
    usePicoStore.setState({ motion: 'idle', face: current.busy ? 'thinking' : 'idle' });
  }, delay);
}

export const usePicoStore = create<PicoState>((set, get) => ({
  open: false,
  face: 'idle',
  presence: 'docked',
  motion: 'idle',
  motionNonce: 0,
  travelTargetId: null,
  travelNonce: 0,
  pageContext: null,
  explicitContext: null,
  contextVersion: 0,
  messages: [],
  busy: false,
  focusNonce: 0,
  cooldownUntil: 0,
  openDock: () => set((state) => ({ open: true, focusNonce: state.focusNonce + 1 })),
  closeDock: () => set({ open: false }),
  react: (motion) => {
    set(reaction(motion));
    settleReaction(get().motionNonce);
  },
  reactToResult: (correct) => {
    set(reaction(correct ? 'hop' : 'wobble', correct ? 'success' : 'error'));
    settleReaction(get().motionNonce, correct ? 1_050 : 820);
  },
  reactToInsight: () => {
    set(reaction('turn', 'success'));
    settleReaction(get().motionNonce, 1_050);
  },
  startTravel: (travelTargetId) => set((state) => ({
    open: false,
    presence: 'traveling',
    travelTargetId,
    travelNonce: state.travelNonce + 1,
  })),
  finishTravel: (nonce) => set((state) => state.travelNonce === nonce && state.presence === 'traveling'
    ? { presence: 'perched' }
    : {}),
  returnToDock: () => set((state) => state.presence === 'docked' || state.presence === 'returning'
    ? {}
    : { presence: 'returning', travelNonce: state.travelNonce + 1 }),
  finishReturn: (nonce) => set((state) => state.travelNonce === nonce && state.presence === 'returning'
    ? { presence: 'docked', travelTargetId: null }
    : {}),
  dockImmediately: () => set({ presence: 'docked', travelTargetId: null }),
  setPageContext: (pageContext) => set((state) => {
    if (state.pageContext?.key === pageContext.key) return { pageContext };
    const contextVersion = state.contextVersion + 1;
    const separator: PicoConversationItem[] = state.pageContext
      ? [{ id: nextId('context'), role: 'context', content: `已切换到「${pageContext.title}」`, contextVersion }]
      : [];
    return { pageContext, explicitContext: null, contextVersion, messages: [...state.messages, ...separator] };
  }),
  ask: (explicitContext) => {
    set((state) => ({ explicitContext, open: true, focusNonce: state.focusNonce + 1, motion: 'attention', motionNonce: state.motionNonce + 1 }));
    settleReaction(get().motionNonce, 700);
  },
  // 原子入口：设置 Explicit Context → 打开 Dock → 直接用这一次的 context 构造请求。
  // 不经过下一次 get() 找 context，避免 explicitContext / busy / contextVersion 的时序依赖。
  askAndSend: async (explicitContext) => {
    const state = get();
    if (!state.pageContext || state.busy || Date.now() < state.cooldownUntil) return;
    set((current) => ({ explicitContext, open: true, focusNonce: current.focusNonce + 1, motion: 'attention', motionNonce: current.motionNonce + 1 }));
    await get().sendPicoMessage(explicitContext, defaultPromptForExplicitContext(explicitContext));
  },
  send: async (raw) => {
    const state = get();
    if (!raw.trim() || state.busy || Date.now() < state.cooldownUntil) return;
    await get().sendPicoMessage(state.explicitContext, raw);
  },
  sendPicoMessage: async (explicitContext, raw) => {
    const message = raw.trim();
    const state = get();
    if (!message || !state.pageContext || state.busy || Date.now() < state.cooldownUntil) return;
    const contextVersion = state.contextVersion;
    const userItem: PicoConversationItem = {
      id: nextId('user'),
      role: 'user',
      content: message,
      contextVersion,
      contextTitle: explicitContext?.title,
      contextExcerpt: explicitContext ? explicitContextExcerpt(explicitContext) : undefined,
    };
    const history: ChatMessage[] = state.messages
      .filter((item): item is Extract<PicoConversationItem, { role: 'user' | 'assistant' }> => item.contextVersion === contextVersion && item.role !== 'context')
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    set((current) => ({ messages: [...current.messages, userItem], busy: true, face: 'thinking', motion: 'attention', motionNonce: current.motionNonce + 1 }));
    const result = await sendChat({ mode: 'pico', message, history, pageContext: state.pageContext, explicitContext: explicitContext ?? undefined });
    if (get().contextVersion !== contextVersion) {
      set({ busy: false, face: 'idle' });
      return;
    }
    const cooldownUntil = Date.now() + AI_SUBMISSION_COOLDOWN_MS;
    set((current) => ({
      messages: [...current.messages, { id: nextId('assistant'), role: 'assistant', content: result.text, source: result.source, contextVersion }],
      busy: false,
      face: 'success',
      motion: 'hop',
      motionNonce: current.motionNonce + 1,
      cooldownUntil,
    }));
    if (result.source === 'live') void speakText(result.text).catch(() => undefined);
    const reactionNonce = get().motionNonce;
    window.setTimeout(() => {
      const current = get();
      if (current.contextVersion === contextVersion && current.motionNonce === reactionNonce) set({ face: 'idle', motion: 'idle' });
      if (current.cooldownUntil === cooldownUntil) set({ cooldownUntil: 0 });
    }, AI_SUBMISSION_COOLDOWN_MS);
  },
}));
