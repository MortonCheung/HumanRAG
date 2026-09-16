import { describe, expect, it } from 'vitest';
import type { PracticeAnswer } from '../../../store/practiceStore';
import { practiceResultStats } from './PracticeSessionSummary';

describe('practiceResultStats', () => {
  it('separates wrong and unanswered questions and scores only submitted answers', () => {
    const answers: Record<string, PracticeAnswer> = {
      q1: { questionId: 'q1', selected: 'a', correct: true },
      q2: { questionId: 'q2', selected: 'b', correct: false },
    };

    expect(practiceResultStats(['q1', 'q2', 'q3', 'q4'], answers)).toEqual({
      answeredCount: 2,
      correctCount: 1,
      wrongCount: 1,
      unansweredCount: 2,
      accuracy: 50,
    });
  });

  it('reports zero accuracy without inventing answers when nothing was submitted', () => {
    expect(practiceResultStats(['q1', 'q2'], {})).toEqual({
      answeredCount: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 2,
      accuracy: 0,
    });
  });
});
