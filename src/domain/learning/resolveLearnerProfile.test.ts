import { describe, expect, it } from 'vitest';
import type { LearnerProfile } from '../../data/v6/schemas/progressSchema';
import { resolveLearnerProfile } from './resolveLearnerProfile';

const base: LearnerProfile = {
  id: 'learner-001',
  name: '演示学习者',
  major: '计算机科学与技术',
  identity: '大三',
  goal: '计算机考研408',
  branchId: '408',
  isDefault: true,
};

describe('resolveLearnerProfile', () => {
  it('只覆盖去除首尾空白后的可编辑字段', () => {
    expect(resolveLearnerProfile(base, { name: '  小林  ', goal: '  AI 工程师 ' })).toEqual({
      ...base,
      name: '小林',
      goal: 'AI 工程师',
    });
  });

  it('空覆盖回退基础值，身份字段保持不变', () => {
    const resolved = resolveLearnerProfile(base, { name: '   ', major: '' });
    expect(resolved).toEqual(base);
    expect(resolved).toMatchObject({ id: base.id, branchId: base.branchId, isDefault: base.isDefault });
  });
});
