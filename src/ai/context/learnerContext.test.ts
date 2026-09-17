import { describe, expect, it } from 'vitest';
import type { AnswerRecord, LearnerProfile, MisconceptionRecord } from '../../data/v6/schemas/progressSchema';
import type { KnowledgeNode } from '../../graph/types';
import { formatBaseContext, formatContextBlock } from './formatContext';
import { buildLearnerContextBundle, selectContextBlocks } from './learnerContext';

const profiles: LearnerProfile[] = [{ id: 'student', name: '小林', major: '软件工程', identity: '大四', goal: '准备复试', branchId: '408', isDefault: true }];
const nodes = new Map<string, Pick<KnowledgeNode, 'id' | 'name' | 'branchId'>>([
  ['tcp', { id: 'tcp', name: 'TCP 慢启动', branchId: '408' }],
  ['react', { id: 'react', name: 'React 状态', branchId: 'frontend' }],
]);
const questions = new Map([
  ['q1', { nodeIds: ['tcp'], stem: '拥塞窗口如何增长？' }],
  ['q2', { nodeIds: ['react'], stem: '状态更新何时提交？' }],
]);
const answers: AnswerRecord[] = [
  { id: 'a1', learnerId: 'student', questionId: 'q1', selected: 'A', correct: false, createdAt: '2026-08-29T10:00:00.000Z' },
  { id: 'a2', learnerId: 'student', questionId: 'q2', selected: 'B', correct: true, createdAt: '2026-08-28T10:00:00.000Z' },
  { id: 'foreign', learnerId: 'other', questionId: 'q2', selected: 'B', correct: false, createdAt: '2026-08-30T10:00:00.000Z' },
];
const misconceptions: MisconceptionRecord[] = [{
  id: 'm1', learnerId: 'student', misconceptionId: 'growth', nodeId: 'tcp', occurrences: 2,
  firstSeenAt: '2026-08-20T10:00:00.000Z', lastSeenAt: '2026-08-29T10:00:00.000Z', status: 'open',
}];

function bundle() {
  return buildLearnerContextBundle({
    learnerId: 'student', profiles, answerRecords: answers, evidenceRecords: [], misconceptionRecords: misconceptions,
    resolveQuestion: (id) => questions.get(id), resolveNode: (id) => nodes.get(id),
    resolveMisconceptionName: () => '把慢启动理解为线性增长',
    recommendation: { pointId: 'tcp', score: 90, reasons: ['最近错答需要巩固。', '先复习增长规则。', '完成一次独立验证。', '不应发送的第四条。'] },
    activityEndDate: '2026-08-29',
  });
}

describe('buildLearnerContextBundle', () => {
  it('复用 Dashboard 聚合并严格限制各块大小', () => {
    const result = bundle();
    expect(result.base.profile).toEqual({ name: '小林', major: '软件工程', identity: '大四', goal: '准备复试' });
    expect(result.base.overall).toMatchObject({ answered: 2, accuracy: 0.5, activeDays: 2, openMisconceptions: 1 });
    expect(result.blocks.mistakes.recentWrongAnswers).toEqual([{ nodeName: 'TCP 慢启动', stem: '拥塞窗口如何增长？', createdAt: '2026-08-29T10:00:00.000Z' }]);
    expect(result.blocks.recommendation?.reasons).toHaveLength(3);
    expect(result.blocks.branches.branches.map((branch) => branch.name)).toEqual(['408', 'AI', '游戏开发', '前端']);
    expect(result.blocks.recentLearning.items).toHaveLength(2);
    expect(result.blocks.activity.activeDates.every((day) => day.count > 0)).toBe(true);
  });

  it('选择器最多发送两个已存在的块', () => {
    const result = bundle();
    expect(selectContextBlocks(result, ['mistakes', 'activity', 'branches']).map((block) => block.type)).toEqual(['mistakes', 'activity']);
  });

  it('Formatter 使用可读段落而非 JSON，并守住字符上限', () => {
    const result = bundle();
    const base = formatBaseContext(result.base);
    const mistakes = formatContextBlock(result.blocks.mistakes);
    expect(base).toContain('[学习者背景]');
    expect(mistakes).toContain('[错题与误区]');
    expect(base).not.toContain('{"');
    expect(base.length).toBeLessThanOrEqual(2_000);
    expect(mistakes.length).toBeLessThanOrEqual(1_800);
  });
});
