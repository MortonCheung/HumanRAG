import { describe, expect, it } from 'vitest';
import type { KnowledgeNode } from '../../graph/types';
import type { AnswerRecord, EvidenceRecord, LearnerProfile, MisconceptionRecord } from '../../data/v6/schemas/progressSchema';
import { buildLearningDashboardSnapshot, type LearningDashboardInput } from './learningDashboard';

const profiles: LearnerProfile[] = [
  { id: 'student', name: '学习者', major: '计算机', identity: '大三', goal: '408', branchId: '408', isDefault: true },
  { id: 'other', name: '其他人', major: '软件', identity: '大二', goal: 'AI', branchId: 'ai', isDefault: false },
];
const nodes = new Map<string, Pick<KnowledgeNode, 'id' | 'name' | 'branchId'>>([
  ['n408', { id: 'n408', name: '408 点', branchId: '408' }],
  ['nai', { id: 'nai', name: 'AI 点', branchId: 'ai' }],
  ['nfe', { id: 'nfe', name: '前端点', branchId: 'frontend' }],
]);
const questionNodes = new Map([['q408', 'n408'], ['q408b', 'n408'], ['qai', 'nai'], ['qfe', 'nfe']]);

function answer(id: string, learnerId: string, questionId: string, correct: boolean, date: string): AnswerRecord {
  return { id, learnerId, questionId, correct, selected: '', createdAt: `${date}T10:00:00.000Z` };
}

function misconception(id: string, learnerId: string, status: MisconceptionRecord['status'], occurrences = 1, lastSeenAt = '2026-08-02T10:00:00.000Z'): MisconceptionRecord {
  return { id, learnerId, status, occurrences, misconceptionId: id, nodeId: 'n408', firstSeenAt: '2026-08-01T10:00:00.000Z', lastSeenAt };
}

function evidence(id: string, learnerId: string): EvidenceRecord {
  return {
    id, learnerId, nodeId: 'n408', source: 'practice', result: 'correct', weight: 0.9,
    createdAt: '2026-08-02T10:00:00.000Z', eventId: id,
    snapshot: { stem: '题目', selected: 'A', expected: 'A', explanation: '依据' },
  };
}

function snapshot(patch: Partial<LearningDashboardInput> = {}) {
  return buildLearningDashboardSnapshot({
    learnerId: 'student',
    profiles,
    answerRecords: [],
    evidenceRecords: [],
    misconceptionRecords: [],
    resolveQuestion: (id) => {
      const nodeId = questionNodes.get(id);
      return nodeId ? { nodeIds: [nodeId] } : undefined;
    },
    resolveNode: (id) => nodes.get(id),
    resolveMisconceptionName: (id) => `误区 ${id}`,
    recommendation: null,
    activityEndDate: '2026-08-29',
    ...patch,
  });
}

describe('LearningDashboardSnapshot', () => {
  it('所有顶层事实只按 learnerId 聚合', () => {
    const result = snapshot({
      answerRecords: [answer('a', 'student', 'q408', true, '2026-08-01'), answer('b', 'other', 'qai', false, '2026-08-02')],
      evidenceRecords: [evidence('own', 'student'), evidence('foreign', 'other')],
      misconceptionRecords: [misconception('own', 'student', 'open'), misconception('foreign', 'other', 'open')],
    });
    expect(result.totals.answered).toBe(1);
    expect(result.totals.openMisconceptions).toBe(1);
    expect(result.learningRecords.map((record) => record.id)).toEqual(['own']);
  });

  it('profile 属于 408 时仍把同一学习者的 AI 与前端答题计入总成绩', () => {
    const result = snapshot({ answerRecords: [
      answer('a', 'student', 'q408', true, '2026-08-01'),
      answer('b', 'student', 'qai', true, '2026-08-02'),
      answer('c', 'student', 'qfe', false, '2026-08-03'),
    ] });
    expect(result.profile.branchId).toBe('408');
    expect(result.totals).toMatchObject({ answered: 3, correct: 2, incorrect: 1 });
  });

  it('只有 branchStats 按方向拆分', () => {
    const result = snapshot({ answerRecords: [
      answer('a', 'student', 'q408', true, '2026-08-01'),
      answer('b', 'student', 'qai', false, '2026-08-02'),
      answer('c', 'student', 'qfe', true, '2026-08-03'),
    ] });
    expect(result.branchStats.map(({ branchId, answered }) => [branchId, answered])).toEqual([
      ['408', 1], ['ai', 1], ['game', 0], ['frontend', 1],
    ]);
  });

  it('无答案方向的 accuracy 为 null，而不是 0', () => {
    const result = snapshot({ answerRecords: [answer('a', 'student', 'q408', false, '2026-08-01')] });
    expect(result.branchStats.find((branch) => branch.branchId === '408')?.accuracy).toBe(0);
    expect(result.branchStats.find((branch) => branch.branchId === 'ai')?.accuracy).toBeNull();
  });

  it('overall accuracy 只等于 correct / answered', () => {
    const result = snapshot({ answerRecords: [
      answer('a', 'student', 'q408', true, '2026-08-01'),
      answer('b', 'student', 'q408', false, '2026-08-01'),
      answer('c', 'student', 'missing', true, '2026-08-01'),
    ] });
    expect(result.totals.accuracy).toBeCloseTo(2 / 3);
    expect(result.totals.answered).toBe(3);
  });

  it('activeDays 对同一天的多次作答去重', () => {
    const result = snapshot({ answerRecords: [
      answer('a', 'student', 'q408', true, '2026-08-01'),
      answer('b', 'student', 'q408', true, '2026-08-01'),
      answer('c', 'student', 'q408', true, '2026-08-03'),
    ] });
    expect(result.totals.activeDays).toBe(2);
  });

  it('longestStreak 计算历史最长连续日期并支持跨月', () => {
    const result = snapshot({ answerRecords: [
      answer('a', 'student', 'q408', true, '2026-07-30'),
      answer('b', 'student', 'q408', true, '2026-07-31'),
      answer('c', 'student', 'q408', true, '2026-08-01'),
      answer('d', 'student', 'q408', true, '2026-08-04'),
    ] });
    expect(result.totals.longestStreak).toBe(3);
  });

  it('touchedPoints 通过 question.nodeIds[0] 去重', () => {
    const result = snapshot({ answerRecords: [
      answer('a', 'student', 'q408', true, '2026-08-01'),
      answer('b', 'student', 'q408b', false, '2026-08-02'),
      answer('c', 'student', 'qai', true, '2026-08-03'),
    ] });
    expect(result.totals.touchedPoints).toBe(2);
  });

  it('openMisconceptions 只统计 open 状态', () => {
    const result = snapshot({ misconceptionRecords: [
      misconception('a', 'student', 'open'),
      misconception('b', 'student', 'remediated'),
      misconception('c', 'student', 'suppressed'),
    ] });
    expect(result.totals.openMisconceptions).toBe(1);
  });

  it('90 天 activity 正确汇总每日 count、accuracy 与等级', () => {
    const records = Array.from({ length: 7 }, (_, index) => answer(`a${index}`, 'student', 'q408', index < 5, '2026-08-29'));
    const result = snapshot({ answerRecords: records });
    expect(result.activity).toHaveLength(90);
    expect(result.activityRange).toEqual({ start: '2026-06-01', end: '2026-08-29' });
    expect(result.activity.at(-1)).toMatchObject({ count: 7, correct: 5, accuracy: 5 / 7, level: 4 });
  });

  it('attention 按次数和最后出现时间排序，最多保留三条', () => {
    const result = snapshot({ misconceptionRecords: [
      misconception('a', 'student', 'open', 2, '2026-08-02T10:00:00.000Z'),
      misconception('b', 'student', 'open', 4, '2026-08-01T10:00:00.000Z'),
      misconception('c', 'student', 'open', 2, '2026-08-03T10:00:00.000Z'),
      misconception('d', 'student', 'open', 1, '2026-08-04T10:00:00.000Z'),
    ] });
    expect(result.attention.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });
});
