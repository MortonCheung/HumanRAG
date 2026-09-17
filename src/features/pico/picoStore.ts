import { create } from 'zustand';
import { AI_SUBMISSION_COOLDOWN_MS, type ChatMessage } from '../../ai/chat/contracts';
import { sendChat } from '../../ai/chat/chatClient';
import type { PicoConversationItem, PicoState } from './picoTypes';

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

export const usePicoStore = create<PicoState>((set, get) => ({
  open: false,
  face: 'idle',
  presence: 'docked',
  pageContext: null,
  explicitContext: null,
  contextVersion: 0,
  messages: [],
  busy: false,
  focusNonce: 0,
  cooldownUntil: 0,
  openDock: () => set((state) => ({ open: true, focusNonce: state.focusNonce + 1 })),
  closeDock: () => set({ open: false }),
  setPageContext: (pageContext) => set((state) => {
    if (state.pageContext?.key === pageContext.key) return { pageContext };
    const contextVersion = state.contextVersion + 1;
    const separator: PicoConversationItem[] = state.pageContext
      ? [{ id: nextId('context'), role: 'context', content: `已切换到「${pageContext.title}」`, contextVersion }]
      : [];
    return { pageContext, explicitContext: null, contextVersion, messages: [...state.messages, ...separator] };
  }),
  ask: (explicitContext) => set((state) => ({ explicitContext, open: true, focusNonce: state.focusNonce + 1 })),
  send: async (raw) => {
    const message = raw.trim();
    const state = get();
    if (!message || !state.pageContext || state.busy || Date.now() < state.cooldownUntil) return;
    const contextVersion = state.contextVersion;
    const userItem: PicoConversationItem = { id: nextId('user'), role: 'user', content: message, contextVersion };
    const history: ChatMessage[] = state.messages
      .filter((item): item is Extract<PicoConversationItem, { role: 'user' | 'assistant' }> => item.contextVersion === contextVersion && item.role !== 'context')
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));
    set({ messages: [...state.messages, userItem], busy: true, face: 'thinking' });
    const result = await sendChat({ mode: 'pico', message, history, pageContext: state.pageContext, explicitContext: state.explicitContext ?? undefined });
    if (get().contextVersion !== contextVersion) {
      set({ busy: false, face: 'idle' });
      return;
    }
    const cooldownUntil = Date.now() + AI_SUBMISSION_COOLDOWN_MS;
    set((current) => ({
      messages: [...current.messages, { id: nextId('assistant'), role: 'assistant', content: result.text, source: result.source, contextVersion }],
      busy: false,
      face: 'success',
      cooldownUntil,
    }));
    window.setTimeout(() => {
      const current = get();
      if (current.contextVersion === contextVersion && current.face === 'success') set({ face: 'idle' });
      if (current.cooldownUntil === cooldownUntil) set({ cooldownUntil: 0 });
    }, AI_SUBMISSION_COOLDOWN_MS);
  },
}));
