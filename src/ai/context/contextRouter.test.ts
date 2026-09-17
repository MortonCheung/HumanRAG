import { describe, expect, it } from 'vitest';
import { routeTutorContext } from './contextRouter';

describe('routeTutorContext', () => {
  it.each([
    ['Transformer 是什么', []],
    ['AI 是什么', []],
    ['我最近学得怎么样', ['activity', 'recentLearning']],
    ['我哪里最薄弱', ['mistakes']],
    ['408 哪里学得不好', ['mistakes', 'branches']],
    ['我下一步应该学什么', ['recommendation', 'mistakes']],
    ['我前端和 408 哪个方向表现更好', ['branches']],
    ['TCP 慢启动为什么这样设计', []],
  ])('%s', (message, expected) => {
    expect(routeTutorContext(message).blocks).toEqual(expected);
  });

  it('一次最多返回两个明细块', () => {
    expect(routeTutorContext('我最近学习状态不好，错题很多，下一步怎么安排前端方向').blocks).toHaveLength(2);
  });
});
