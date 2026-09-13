import { create } from 'zustand';

export interface LearningQuestion {
  id: string;
  pointId: string;
  learnerId: string;
  text: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

interface LearningQuestionState {
  questions: LearningQuestion[];
  storageError: string | null;
  addQuestion: (input: Pick<LearningQuestion, 'pointId' | 'learnerId' | 'text'>) => boolean;
  resolveQuestion: (id: string) => boolean;
  reset: () => void;
}

const STORAGE_KEY = 'iteach:v11:learning-questions';

function readQuestions(): LearningQuestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is LearningQuestion => Boolean(item && typeof item === 'object'
      && typeof (item as LearningQuestion).id === 'string'
      && typeof (item as LearningQuestion).pointId === 'string'
      && typeof (item as LearningQuestion).learnerId === 'string'
      && typeof (item as LearningQuestion).text === 'string'
      && ['open', 'resolved'].includes((item as LearningQuestion).status)));
  } catch { return []; }
}

function saveQuestions(questions: LearningQuestion[]) {
  if (typeof window === 'undefined') return true;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questions)); return true; } catch { return false; }
}

export const useLearningQuestionStore = create<LearningQuestionState>((set, get) => ({
  questions: readQuestions(),
  storageError: null,
  addQuestion: ({ pointId, learnerId, text }) => {
    const normalized = text.trim();
    if (!normalized) return false;
    const createdAt = new Date().toISOString();
    const next = [...get().questions, { id: `question-${learnerId}-${Date.now()}`, pointId, learnerId, text: normalized, status: 'open' as const, createdAt }];
    if (!saveQuestions(next)) { set({ storageError: '问题没有保存，请检查本地存储后重试。' }); return false; }
    set({ questions: next, storageError: null });
    return true;
  },
  resolveQuestion: (id) => {
    const next = get().questions.map((question) => question.id === id ? { ...question, status: 'resolved' as const } : question);
    if (!saveQuestions(next)) { set({ storageError: '问题状态没有保存，请重试。' }); return false; }
    set({ questions: next, storageError: null });
    return true;
  },
  reset: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
    set({ questions: [], storageError: null });
  },
}));

