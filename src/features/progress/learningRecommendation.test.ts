import { describe, expect, it } from 'vitest';
import type { EvidenceRecord, RemediationTask } from '../../data/v6/schemas/progressSchema';
import { recommendLearningNode, type RecommendationNode } from './learningRecommendation';

const nodes: RecommendationNode[] = [
  { id: 'base', name: '基础', prerequisiteIds: [] },
  { id: 'target', name: '目标', prerequisiteIds: ['base'] },
];
function record(id: string, nodeId: string, patch: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return { id, eventId: id, questionId: id, nodeId, learnerId: 'student', source: 'independent-check', result: 'correct',
    weight: 0.9, contentVersion: 'v1', createdAt: '2026-09-11T10:00:00.000Z', sessionId: nodeId, attempt: 1,
    assistance: 'independent', firstExposure: true, snapshot: { stem: '', selected: '', expected: '', explanation: '' }, ...patch };
}
const prerequisitePass = [record('base-1', 'base'), record('base-2', 'base', { verificationQuestionIds: ['base-1', 'base-2'] })];
const failure = record('target-1', 'target', { result: 'incorrect', misconceptionId: 'confusion' });
const task: RemediationTask = { id: 'remediation', learnerId: 'student', unitId: 'tu-target', misconceptionId: 'confusion', status: 'pending', createdAt: failure.createdAt, reason: '需巩固' };

describe('统一可解释推荐', () => {
  it('同样事实产生确定输出，不依赖节点输入顺序，也不修改事实', () => {
    const evidence = Object.freeze([...prerequisitePass, failure]);
    const input = { learnerId: 'student', nodes, evidence, remediationTasks: [task] };
    const result = recommendLearningNode(input);
    expect(result).toEqual(recommendLearningNode({ ...input, nodes: [...nodes].reverse() }));
    expect(result?.pointId).toBe('target');
    expect(result?.score).toBe(110);
    expect(result?.reasons).toContain('前置知识已有独立验证记录。');
    expect(result?.reasons).toContain('已有与实际错答对应的补救任务。');
    expect(result?.reasons).toContain('最近作答尚未通过，需要巩固。');
  });

  it('前置没有通过时，先推荐范围内的前置节点，不声称基础已满足', () => {
    const result = recommendLearningNode({ learnerId: 'student', nodes, evidence: [failure], remediationTasks: [task] });
    expect(result?.pointId).toBe('base');
    expect(result?.reasons).toContain('先补「目标」所需的前置知识。');
    expect(result?.reasons.join('')).not.toContain('前置知识已有独立验证记录');
  });

  it('不将其他学习者、旧演示任务或旧错答用于推荐原因', () => {
    const result = recommendLearningNode({ learnerId: 'student', nodes, evidence: [{ ...failure, learnerId: 'other' }, { ...failure, id: 'legacy', eventId: undefined }], remediationTasks: [task] });
    expect(result?.reasons.join('')).not.toMatch(/实际错答|最近作答|同一误区/);
  });

  it('相同误区至少两个独立事件，才能说重复误区', () => {
    const input = { learnerId: 'student', nodes, evidence: [...prerequisitePass, failure, failure] };
    expect(recommendLearningNode(input)?.reasons.join('')).not.toContain('不止一次');
    expect(recommendLearningNode({ ...input, evidence: [...input.evidence, { ...failure, id: 'again', eventId: 'again' }] })?.reasons.join('')).toContain('不止一次');
  });

  it('只在指定范围中推荐；范围外未验证前置只能如实说明', () => {
    const result = recommendLearningNode({ learnerId: 'student', nodes: [nodes[1]], evidence: [failure] });
    expect(result?.pointId).toBe('target');
    expect(result?.reasons).toContain('部分前置知识尚未验证，建议先确认基础。');
  });

  it('未解决的问题进入同一推荐排序与原因，解决后自动退出', () => {
    const question = { id: 'open-1', pointId: 'target', learnerId: 'student', text: '为什么会这样？', status: 'open' as const, createdAt: failure.createdAt };
    const result = recommendLearningNode({ learnerId: 'student', nodes, evidence: prerequisitePass, learningQuestions: [question] });
    expect(result?.pointId).toBe('target');
    expect(result?.score).toBe(48);
    expect(result?.reasons).toContain('你在这个知识点留下了尚未解决的问题。');
    expect(recommendLearningNode({ learnerId: 'student', nodes, evidence: prerequisitePass, learningQuestions: [{ ...question, status: 'resolved' }] })?.reasons.join('')).not.toContain('尚未解决的问题');
  });

  it('所有节点已通过即无待学推荐，残留补救任务不强行重新推荐', () => {
    const evidence = [...prerequisitePass, record('target-2', 'target'), record('target-3', 'target', { verificationQuestionIds: ['target-2', 'target-3'] })];
    expect(recommendLearningNode({ learnerId: 'student', nodes, evidence, remediationTasks: [task] })).toBeNull();
    expect(recommendLearningNode({ learnerId: 'student', nodes: [], evidence: [] })).toBeNull();
  });

  it('循环关系不造成推荐死循环，且不声称前置已满足', () => {
    const cyclic = [{ ...nodes[0], prerequisiteIds: ['target'] }, nodes[1]];
    const result = recommendLearningNode({ learnerId: 'student', nodes: cyclic, evidence: [] });
    expect(result?.pointId).toBeDefined();
    expect(result?.reasons.join('')).toContain('尚未验证');
  });
});
