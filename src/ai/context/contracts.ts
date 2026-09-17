export interface LearnerBaseContext {
  dataMode: 'demo';
  profile: {
    name: string;
    major: string;
    identity: string;
    goal: string;
  };
  overall: {
    accuracy: number | null;
    answered: number;
    activeDays: number;
    longestStreak: number;
    touchedPoints: number;
    openMisconceptions: number;
  };
  weakPoints: string[];
  recommendation?: {
    pointName: string;
    reason?: string;
  };
}

export type ContextBlockId = 'mistakes' | 'activity' | 'branches' | 'recommendation' | 'recentLearning';

export interface MistakesBlock {
  type: 'mistakes';
  misconceptions: Array<{ name: string; nodeName: string; occurrences: number; lastSeenAt: string }>;
  recentWrongAnswers: Array<{ nodeName: string; stem: string; createdAt: string }>;
}

export interface ActivityBlock {
  type: 'activity';
  activeDays: number;
  longestStreak: number;
  recent14Days: { answered: number; correct: number; activeDays: number; accuracy: number | null };
  activeDates: Array<{ date: string; count: number; accuracy: number | null }>;
}

export interface BranchesBlock {
  type: 'branches';
  branches: Array<{ name: string; answered: number; touchedPoints: number; accuracy: number | null }>;
}

export interface RecommendationBlock {
  type: 'recommendation';
  pointName: string;
  pointId: string;
  reasons: string[];
}

export interface RecentLearningBlock {
  type: 'recentLearning';
  items: Array<{ date: string; nodeName: string; correct: boolean }>;
}

export type ContextBlock = MistakesBlock | ActivityBlock | BranchesBlock | RecommendationBlock | RecentLearningBlock;

export interface LearnerContextBundle {
  base: LearnerBaseContext;
  blocks: {
    mistakes: MistakesBlock;
    activity: ActivityBlock;
    branches: BranchesBlock;
    recommendation?: RecommendationBlock;
    recentLearning: RecentLearningBlock;
  };
}

export type TutorIntent = 'general' | 'learning-overview' | 'weakness' | 'activity' | 'planning' | 'branch-analysis' | 'recent-learning';

export interface TutorRouteResult {
  intent: TutorIntent;
  blocks: ContextBlockId[];
  flags: { asksEvaluation: boolean };
}
