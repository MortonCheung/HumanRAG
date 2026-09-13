import { describe, expect, it } from 'vitest';
import type { EvidenceRecord, RemediationTask } from '../../data/v6/schemas/progressSchema';
import { welcomePrompt } from './welcomePrompt';

const record: EvidenceRecord = { id: 'e', eventId: 'e', learnerId: 'a', nodeId: 'p', questionId: 'q',
  source: 'practice', result: 'incorrect', weight: 0.6, createdAt: '2026-09-11T10:00:00Z',
  contentVersion: 'v1', misconceptionId: 'm', snapshot: { stem: '题目', selected: 'A', expected: 'B', explanation: '原因' } };
const task: RemediationTask = { id: 't', learnerId: 'a', unitId: 'tu-p', misconceptionId: 'm', status: 'pending', createdAt: record.createdAt, reason: '巩固' };
const input = { learnerId: 'a', evidence: [], tasks: [], variant: 0 };
describe('手工欢迎文案', () => {
  it('优先补救，其次最近学习，再其次推荐', () => {
    const recommendation = { pointId: 'p', score: 36, reasons: ['实际原因'] };
    expect(welcomePrompt({ ...input, evidence: [record], tasks: [task], recommendation }).kind).toBe('remediation');
    expect(welcomePrompt({ ...input, evidence: [record], recommendation }).kind).toBe('recent');
    expect(welcomePrompt({ ...input, recommendation }).kind).toBe('recommended');
  });
  it('旧演示和其他学习者记录不能构造个人上下文', () => {
    expect(welcomePrompt({ ...input, evidence: [{ ...record, eventId: undefined }], tasks: [task] }).kind).toBe('base');
    expect(welcomePrompt({ ...input, learnerId: 'b', evidence: [record], tasks: [task] }).kind).toBe('base');
  });
  it('同样输入始终是同样文案，基础池有限', () => {
    expect(welcomePrompt(input)).toEqual(welcomePrompt(input));
    expect(welcomePrompt({ ...input, variant: 3 })).toEqual(welcomePrompt(input));
    expect(welcomePrompt({ ...input, variant: NaN })).toEqual(welcomePrompt(input));
  });
});
