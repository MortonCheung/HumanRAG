import { describe, expect, it } from 'vitest';
import type { LearnerContextBundle } from '../../ai/context/contracts';
import { buildInsightSignature, cacheInsight, cachedInsight, selectInsightContextBlocks } from './learningInsight';

const bundle: LearnerContextBundle = {
  base: {
    dataMode: 'demo', profile: { name: '小林', major: '软件工程', identity: '大四', goal: '复试' },
    overall: { accuracy: 0.5, answered: 2, activeDays: 2, longestStreak: 2, touchedPoints: 1, openMisconceptions: 1 }, weakPoints: ['TCP'],
  },
  blocks: {
    mistakes: { type: 'mistakes', misconceptions: [{ name: '误区', nodeName: 'TCP', occurrences: 2, lastSeenAt: '2026-09-01' }], recentWrongAnswers: [] },
    activity: { type: 'activity', activeDays: 2, longestStreak: 2, recent14Days: { answered: 2, correct: 1, activeDays: 2, accuracy: 0.5 }, activeDates: [] },
    branches: { type: 'branches', branches: [] },
    recommendation: { type: 'recommendation', pointName: 'TCP', pointId: 'tcp', reasons: ['巩固'] },
    recentLearning: { type: 'recentLearning', items: [] },
  },
};

describe('learning insight', () => {
  it('优先选择 mistakes + recommendation，最多两个块', () => {
    expect(selectInsightContextBlocks(bundle).map((block) => block.type)).toEqual(['mistakes', 'recommendation']);
    expect(selectInsightContextBlocks({ ...bundle, blocks: { ...bundle.blocks, mistakes: { type: 'mistakes', misconceptions: [], recentWrongAnswers: [] } } }).map((block) => block.type)).toEqual(['activity', 'recommendation']);
  });

  it('同一快照签名复用会话缓存', () => {
    const signature = buildInsightSignature({ learnerId: 'student', answered: 2, correct: 1, openMisconceptions: 1, recommendationPointId: 'tcp' });
    cacheInsight(signature, { text: '洞察', source: 'mock' });
    expect(cachedInsight(signature)).toEqual({ text: '洞察', source: 'mock' });
  });
});
