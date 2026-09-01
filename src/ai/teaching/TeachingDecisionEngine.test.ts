import { describe, expect, it } from 'vitest';
import type { Question, QuestionAnswer } from '../../data/v6/schemas/questionSchema';
import { evaluateAnswer, normalizeAnswer } from './TeachingDecisionEngine';

/** 构造最小可用题目，只填充 evaluateAnswer 与 normalizeAnswer 用到的字段。 */
function makeQuestion(input: {
  type: Question['type'];
  answer: QuestionAnswer;
  misconceptionByAnswer?: Record<string, string>;
}): Question {
  return {
    id: 'test-q',
    blueprintId: 'test-bp',
    variantSeed: 0,
    nodeIds: ['node-1'],
    type: input.type,
    difficulty: 1,
    stem: '测试题干',
    options: [
      { id: 'A', text: '选项 A' },
      { id: 'B', text: '选项 B' },
      { id: 'C', text: '选项 C' },
    ],
    answer: input.answer,
    explanation: '测试解析',
    misconceptionByAnswer: input.misconceptionByAnswer ?? {},
    sourceLabel: '测试来源',
  };
}

describe('normalizeAnswer 统一答案标准化', () => {
  it('多选按集合比较，忽略顺序', () => {
    expect(normalizeAnswer('multiple-choice', 'B,A')).toBe('A,B');
    expect(normalizeAnswer('multiple-choice', 'A,B')).toBe('A,B');
    expect(normalizeAnswer('multiple-choice', 'A,B')).not.toBe('A');
    expect(normalizeAnswer('multiple-choice', ' A , B ')).toBe('A,B');
  });

  it('排序题保留顺序，顺序不同即错误', () => {
    expect(normalizeAnswer('ordering', 'A,B')).not.toBe(normalizeAnswer('ordering', 'B,A'));
    expect(normalizeAnswer('ordering', 'A,B')).toBe('A,B');
  });

  it('填空折叠连续空白为单空格', () => {
    expect(normalizeAnswer('fill-blank', '  二分   查找 ')).toBe('二分 查找');
  });

  it('单选与代码追踪严格单值相等', () => {
    expect(normalizeAnswer('single-choice', ' A ')).toBe('A');
    expect(normalizeAnswer('code-trace', ' A ')).toBe('A');
  });
});

describe('evaluateAnswer 五类题型判定', () => {
  it('单选：选对为正确，选错为错误', () => {
    const q = makeQuestion({ type: 'single-choice', answer: { kind: 'choice', optionIds: ['A'] } });
    expect(evaluateAnswer(q, 'A').correct).toBe(true);
    expect(evaluateAnswer(q, 'B').correct).toBe(false);
  });

  it('多选：集合相等即正确，顺序无关，缺选/多选为错误', () => {
    const q = makeQuestion({ type: 'multiple-choice', answer: { kind: 'choice', optionIds: ['A', 'C'] } });
    expect(evaluateAnswer(q, 'A,C').correct).toBe(true);
    expect(evaluateAnswer(q, 'C,A').correct).toBe(true);
    expect(evaluateAnswer(q, 'A').correct).toBe(false);
    expect(evaluateAnswer(q, 'A,B,C').correct).toBe(false);
  });

  it('判断：正确值判定，且误区绑定错误值', () => {
    const q = makeQuestion({
      type: 'true-false',
      answer: { kind: 'boolean', value: true },
      misconceptionByAnswer: { false: '把成立条件记反了' },
    });
    expect(evaluateAnswer(q, 'true').correct).toBe(true);
    const wrong = evaluateAnswer(q, 'false');
    expect(wrong.correct).toBe(false);
    expect(wrong.misconceptionText).toBe('把成立条件记反了');
  });

  it('填空：折叠空白后比较，答对为正确', () => {
    const q = makeQuestion({ type: 'fill-blank', answer: { kind: 'text', value: '二分 查找' } });
    expect(evaluateAnswer(q, '二分   查找').correct).toBe(true);
    expect(evaluateAnswer(q, '顺序查找').correct).toBe(false);
  });

  it('排序：顺序正确为正确，顺序颠倒为错误', () => {
    const q = makeQuestion({ type: 'ordering', answer: { kind: 'ordering', optionIds: ['A', 'B', 'C'] } });
    expect(evaluateAnswer(q, 'A,B,C').correct).toBe(true);
    expect(evaluateAnswer(q, 'B,A,C').correct).toBe(false);
  });
});
