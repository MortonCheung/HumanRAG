import type { ContextBlock, LearnerBaseContext, TutorRouteResult } from '../context/contracts';

export type ChatMode = 'pico' | 'tutor' | 'insight';
export type ChatSource = 'live' | 'mock';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type PicoPageType = 'universe' | 'library' | 'tree' | 'study' | 'teach' | 'practice' | 'progress';
export type PicoAnswerPolicy = 'normal' | 'hint-only' | 'review';
export type PicoActiveQuestion =
  | { questionId: string; stem: string; state: 'before-submit'; answerPolicy: 'hint-only' }
  | { questionId: string; stem: string; state: 'after-submit'; answerPolicy: 'review'; userAnswer: string; expectedAnswer: string; explanation: string };

export interface PicoPageContext {
  key: string;
  route: string;
  pageType: PicoPageType;
  title: string;
  treeId?: string;
  selectedNode?: { id: string; name: string; description?: string };
  teaching?: { unitId: string; stepId: string; stepTitle: string; stepKind: string };
  activeQuestion?: PicoActiveQuestion;
}

export type PicoExplicitContext =
  | { type: 'knowledge'; nodeId: string; title: string; description?: string }
  | { type: 'content'; nodeId?: string; title: string; content: string }
  | { type: 'question'; questionId: string; title: string; stem: string; answerPolicy: 'hint-only' }
  | { type: 'question'; questionId: string; title: string; stem: string; answerPolicy: 'review'; userAnswer?: string; expectedAnswer?: string; explanation?: string; misconception?: string };

export interface TutorChatRequest {
  mode: 'tutor';
  message: string;
  history: ChatMessage[];
  baseContext: LearnerBaseContext;
  contextBlocks: ContextBlock[];
  routing: TutorRouteResult;
}

export interface PicoChatRequest {
  mode: 'pico';
  message: string;
  history: ChatMessage[];
  pageContext: PicoPageContext;
  explicitContext?: PicoExplicitContext;
}

export interface InsightRequest {
  mode: 'insight';
  baseContext: LearnerBaseContext;
  contextBlocks: ContextBlock[];
}

export type ChatRequest = TutorChatRequest | PicoChatRequest | InsightRequest;
export interface ChatResult { text: string; source: ChatSource }

export const AI_BUDGETS = {
  pico: { userChars: 600, historyPairs: 4, outputTokens: 420 },
  tutor: { userChars: 1_000, historyPairs: 6, outputTokens: 650 },
  insight: { userChars: 0, historyPairs: 0, outputTokens: 260 },
} as const;

export const AI_SUBMISSION_COOLDOWN_MS = 1_200;
