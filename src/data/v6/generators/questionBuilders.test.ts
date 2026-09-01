import { describe, expect, it } from 'vitest';
import { SeededRandom } from './seededRandom';
import { buildOrdering, buildTrueFalse } from './questionBuilders';
import { evaluateAnswer } from '../../../ai/teaching/TeachingDecisionEngine';
import type { Question, QuestionMaterial } from '../schemas/questionSchema';

function orderingIds(material: QuestionMaterial): string[] {
  if (material.answer.kind !== 'ordering') throw new Error('期望排序题答案');
  return material.answer.optionIds;
}

function wrap(material: QuestionMaterial, type: Question['type']): Question {
  return {
    id: 'test-q',
    blueprintId: 'test-bp',
    variantSeed: 0,
    nodeIds: ['node-1'],
    type,
    difficulty: 1,
    stem: material.stem,
    options: material.options,
    answer: material.answer,
    explanation: material.explanation,
    misconceptionByAnswer: material.misconceptionByAnswer ?? {},
    sourceLabel: '测试来源',
  };
}

describe('buildOrdering 排序题生成器', () => {
  it('正确答案反映真实顺序：按选项 id 还原即等于原始条目顺序', () => {
    const items = ['第一步', '第二步', '第三步', '第四步'];
    const material = buildOrdering({
      rng: new SeededRandom('ordering:test'),
      stem: '正确顺序？',
      items,
      explanation: '解析',
    });

    const options = material.options ?? [];
    const byId = new Map(options.map((option) => [option.id, option.text]));
    expect(material.answer.kind).toBe('ordering');
    const restored = orderingIds(material).map((id) => byId.get(id));
    expect(restored).toEqual(items);
  });

  it('判定引擎对生成题：正确顺序判对，颠倒顺序判错', () => {
    const items = ['确认定义', '分析场景', '对比取舍', '验证结论'];
    const material = buildOrdering({
      rng: new SeededRandom('ordering:eval'),
      stem: '正确顺序？',
      items,
      explanation: '解析',
    });
    const question = wrap(material, 'ordering');
    const correct = orderingIds(material).join(',');
    expect(evaluateAnswer(question, correct).correct).toBe(true);

    const wrong = [...orderingIds(material)].reverse().join(',');
    expect(evaluateAnswer(question, wrong).correct).toBe(false);
  });

  it('洗牌结果不与正确顺序完全一致', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const items = ['A', 'B', 'C', 'D'];
      const material = buildOrdering({
        rng: new SeededRandom(seed),
        stem: '顺序？',
        items,
        explanation: '解析',
      });
      const isIdentity = orderingIds(material).every(
        (id, index) => id.charCodeAt(0) - 65 === index,
      );
      expect(isIdentity).toBe(false);
    }
  });
});

describe('buildTrueFalse 判断题生成器', () => {
  it('误区绑定到错误值（正确答案为 true 时绑定 false）', () => {
    const material = buildTrueFalse({
      stem: '判断：正确陈述',
      value: true,
      explanation: '解析',
      misconception: '记反了成立条件',
    });
    expect(material.misconceptionByAnswer?.['false']).toBe('记反了成立条件');
    expect(material.misconceptionByAnswer?.['true']).toBeUndefined();
  });

  it('误区绑定到错误值（正确答案为 false 时绑定 true）', () => {
    const material = buildTrueFalse({
      stem: '判断：错误陈述',
      value: false,
      explanation: '解析',
      misconception: '把错误陈述当成了定义',
    });
    expect(material.misconceptionByAnswer?.['true']).toBe('把错误陈述当成了定义');
    expect(material.misconceptionByAnswer?.['false']).toBeUndefined();
  });

  it('判定引擎对判断题：错误选项命中误区', () => {
    const material = buildTrueFalse({
      stem: '判断：正确陈述',
      value: true,
      explanation: '解析',
      misconception: '记反了成立条件',
    });
    const question = wrap(material, 'true-false');
    expect(evaluateAnswer(question, 'true').correct).toBe(true);
    const wrong = evaluateAnswer(question, 'false');
    expect(wrong.correct).toBe(false);
    expect(wrong.misconceptionText).toBe('记反了成立条件');
  });
});
