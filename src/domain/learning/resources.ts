export interface LearningReference {
  title: string;
  source: string;
  url?: string;
  note?: string;
}

export interface LearningResource {
  type: 'reference' | 'reading' | 'standard' | 'interactive';
  title: string;
  url?: string;
}

