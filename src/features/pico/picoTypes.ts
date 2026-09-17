import type { ChatSource, PicoExplicitContext, PicoPageContext } from '../../ai/chat/contracts';

export type { PicoExplicitContext, PicoPageContext, PicoPageType } from '../../ai/chat/contracts';

export type PicoFace = 'idle' | 'thinking' | 'success' | 'error';
export type PicoPresence = 'docked' | 'traveling' | 'perched' | 'returning';
export type PicoMotion = 'idle' | 'attention' | 'hop' | 'wobble' | 'turn';

export type PicoConversationItem =
  | { id: string; role: 'user'; content: string; contextVersion: number }
  | { id: string; role: 'assistant'; content: string; contextVersion: number; source: ChatSource }
  | { id: string; role: 'context'; content: string; contextVersion: number };

export interface PicoState {
  open: boolean;
  face: PicoFace;
  presence: PicoPresence;
  motion: PicoMotion;
  motionNonce: number;
  travelTargetId: string | null;
  travelNonce: number;
  pageContext: PicoPageContext | null;
  explicitContext: PicoExplicitContext | null;
  contextVersion: number;
  messages: PicoConversationItem[];
  busy: boolean;
  focusNonce: number;
  cooldownUntil: number;
  openDock: () => void;
  closeDock: () => void;
  react: (motion: Exclude<PicoMotion, 'idle'>) => void;
  reactToResult: (correct: boolean) => void;
  reactToInsight: () => void;
  startTravel: (nodeId: string) => void;
  finishTravel: (nonce: number) => void;
  returnToDock: () => void;
  finishReturn: (nonce: number) => void;
  dockImmediately: () => void;
  setPageContext: (context: PicoPageContext) => void;
  ask: (context: PicoExplicitContext) => void;
  send: (text: string) => Promise<void>;
}
