import { describe, expect, it } from 'vitest';
import type { Question } from '../../data/v6/schemas/questionSchema';
import type { TeachingContentBlock } from '../../data/v6/schemas/teachingSchema';
import { questionExplicitContext } from './questionContext';
import { serializeTeachingBlock } from './serializeTeachingBlock';

const question: Question = {
  id: 'q1', blueprintId: 'b1', variantSeed: 0, nodeIds: ['tcp'], type: 'single-choice', difficulty: 2,
  stem: '窗口怎样增长？', options: [{ id: 'a', text: '翻倍' }, { id: 'b', text: '加一' }],
  answer: { kind: 'choice', optionIds: ['a'] }, explanation: '门限前翻倍。', misconceptionByAnswer: {}, sourceLabel: '测试',
};

describe('Pico 显式上下文', () => {
  it('未提交题目对象不包含答案、解析或用户作答字段', () => {
    const context = questionExplicitContext(question, '第 1 题');
    expect(context).toEqual({ type: 'question', questionId: 'q1', title: '第 1 题', stem: '窗口怎样增长？', answerPolicy: 'hint-only' });
    expect(context).not.toHaveProperty('expectedAnswer');
    expect(context).not.toHaveProperty('explanation');
  });

  it('提交后才构造可复盘内容', () => {
    expect(questionExplicitContext(question, '第 1 题', { selected: 'b', misconceptionText: '混淆阶段' })).toMatchObject({
      answerPolicy: 'review', userAnswer: '加一', expectedAnswer: '翻倍', explanation: '门限前翻倍。', misconception: '混淆阶段',
    });
  });

  it('教学内容序列化最多 1200 字符', () => {
    const block: TeachingContentBlock = { kind: 'paragraph', text: '概念'.repeat(800) };
    expect(serializeTeachingBlock(block)).toHaveLength(1_200);
  });
});
