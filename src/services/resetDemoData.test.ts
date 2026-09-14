// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { useLearningQuestionStore } from '../domain/learning/learningQuestions';
import { createTree, migrateV9, resetV9Domain } from '../domain/knowledge/migration';
import { resetDemoData } from './resetDemoData';

describe('resetDemoData', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLearningQuestionStore.getState().reset();
    resetV9Domain();
  });

  it('clears learning questions from memory and local storage', () => {
    expect(useLearningQuestionStore.getState().addQuestion({
      learnerId: 'learner',
      pointId: 'tcp',
      text: '为什么拥塞窗口会倍增？',
    })).toBe(true);

    resetDemoData();

    expect(useLearningQuestionStore.getState().questions).toEqual([]);
    expect(window.localStorage.getItem('iteach:v11:learning-questions')).toBeNull();
  });

  it('removes generated trees so the same competition goal can be composed again', () => {
    const { library } = migrateV9();
    const identity = { name: '考研408 · 定向学习', description: '比赛演示', color: '#b1d8ca' };
    createTree(library.id, { identity, pointIds: ['knowledge-tcp'] });

    resetDemoData();

    expect(migrateV9().userTrees).toEqual([]);
    expect(() => createTree(library.id, { identity, pointIds: ['knowledge-tcp'] })).not.toThrow();
  });
});
