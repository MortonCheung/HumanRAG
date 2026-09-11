import { describe, expect, it } from 'vitest';
import type { EvidenceRecord } from '../../data/v6/schemas/progressSchema';
import { TCP_NODE_ID, TCP_VERSION } from '../../data/v6/handcrafted/tcpLesson';
import { deriveLearningStatus } from './learningStatus';

function evidence(id: string, patch: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return { id, eventId: `event-${id}`, questionId: `q-${id}`, learnerId: 'learner-a', nodeId: 'point-a',
    source: 'independent-check', result: 'correct', weight: 0.9, createdAt: '2026-09-11T10:00:00.000Z',
    contentVersion: 'question-snapshot-v1', sessionId: 'check-a', attempt: 1, assistance: 'independent', firstExposure: true,
    snapshot: { stem: '题目', selected: '答案', expected: '答案', explanation: '解释' }, ...patch };
}
const derive = (records: EvidenceRecord[], nodeId = 'point-a', learnerId = 'learner-a') => deriveLearningStatus(nodeId, learnerId, records);
const completedPair = () => [evidence('1'), evidence('2', { verificationQuestionIds: ['q-1', 'q-2'] })];

describe('统一学习证据状态', () => {
  it('无记录或只有缺少事实的旧记录时，不推定当前掌握', () => {
    expect(derive([]).status).toBe('unknown');
    expect(derive([evidence('legacy', { eventId: undefined, snapshot: undefined })])).toMatchObject({ status: 'unknown', evidenceCount: 1 });
    expect(derive([evidence('bad-date', { createdAt: 'not-a-date' })]).status).toBe('unknown');
  });

  it('普通 train 即使首次、无提示、全对也不是独立验证', () => {
    expect(derive([evidence('1', { source: 'practice' }), evidence('2', { source: 'practice' })]).status).toBe('learning');
    expect(derive([evidence('1', { source: 'diagnostic' })]).status).toBe('learning');
  });

  it('两道不同的新题同轮无帮助通过，解释仅为本次验证', () => {
    const result = derive(completedPair());
    expect(result.status).toBe('verified');
    expect(result.reason).toContain('不代表长期掌握');
  });

  it.each([
    { assistance: 'hint' as const }, { assistance: 'demonstration' as const },
    { assistance: 'unknown' as const }, { firstExposure: false }, { snapshot: undefined },
    { sessionId: undefined }, { attempt: undefined },
  ])('不把缺失条件或帮助后的正确算作验证：%j', (patch) => {
    expect(derive([evidence('1', patch), completedPair()[1]]).status).not.toBe('verified');
  });

  it('一次通过、重复事件、同一道题、跨会话/轮次/版本都不能凑足证据', () => {
    expect(derive([evidence('1')]).status).toBe('needs-verification');
    expect(derive([evidence('1'), evidence('1')]).evidenceCount).toBe(1);
    expect(derive([evidence('1'), evidence('1')]).status).not.toBe('verified');
    expect(derive([evidence('1'), evidence('2', { questionId: 'q-1' })]).status).not.toBe('verified');
    for (const patch of [{ sessionId: 'check-b' }, { attempt: 2 }, { contentVersion: 'new-version' }]) {
      expect(derive([evidence('1'), { ...completedPair()[1], ...patch }]).status).not.toBe('verified');
    }
  });

  it('同一验证组内失败或获得帮助，不能只挑其中两道正确任务宣布通过', () => {
    expect(derive([evidence('bad', { result: 'incorrect' }), ...completedPair()]).status).toBe('needs-reinforcement');
    expect(derive([evidence('helped', { assistance: 'hint' }), ...completedPair()]).status).toBe('needs-verification');
  });

  it('新失败要求巩固，辅助完成要求新验证，后续真正新一轮通过可恢复', () => {
    const passed = completedPair();
    const failed = evidence('3', { result: 'incorrect', sessionId: 'check-b', createdAt: '2026-09-11T10:01:00.000Z' });
    const helped = evidence('4', { source: 'guided-practice', assistance: 'demonstration', createdAt: '2026-09-11T10:02:00.000Z' });
    expect(derive([...passed, failed]).status).toBe('needs-reinforcement');
    expect(derive([...passed, failed, helped]).status).toBe('needs-verification');
    const fresh = ['5', '6'].map((id) => evidence(id, { sessionId: 'check-c', createdAt: '2026-09-11T10:03:00.000Z', verificationQuestionIds: id === '6' ? ['q-5', 'q-6'] : undefined }));
    expect(derive([...passed, failed, helped, ...fresh]).status).toBe('verified');
  });

  it('按实际时间判断最新状态，不依赖不同时间记录的输入顺序', () => {
    const failure = evidence('0', { result: 'incorrect', sessionId: 'old', createdAt: '2026-09-10T10:00:00.000Z' });
    expect(derive([...completedPair(), failure]).status).toBe('verified');
  });

  it('不同知识点和不同学习者不能互相提供验证证据', () => {
    expect(derive([evidence('1'), { ...completedPair()[1], learnerId: 'learner-b' }]).status).not.toBe('verified');
    expect(derive([evidence('1'), { ...completedPair()[1], nodeId: 'point-b' }]).status).not.toBe('verified');
  });

  it('普通记录没有完成事实时，即使前两题均正确，也不提前宣布整轮通过', () => {
    expect(derive([evidence('1'), evidence('2')]).status).toBe('needs-verification');
    expect(derive([evidence('1'), evidence('2', { verificationQuestionIds: ['q-1', 'q-2', 'q-3'] })]).status).not.toBe('verified');
    expect(derive([evidence('1'), evidence('2'), evidence('3', { verificationQuestionIds: ['q-1', 'q-2', 'q-3'] })]).status).toBe('verified');
  });

  it('完成清单必须唯一、覆盖全部作答且位于最后一条记录，不能遗漏失败或多余题目', () => {
    expect(derive([evidence('1'), evidence('2', { verificationQuestionIds: ['q-1', 'q-1'] })]).status).not.toBe('verified');
    expect(derive([evidence('1'), evidence('2', { verificationQuestionIds: ['q-1', 'q-other'] })]).status).not.toBe('verified');
    expect(derive([...completedPair(), evidence('3')]).status).not.toBe('verified');
    expect(derive([evidence('bad', { result: 'incorrect', snapshot: undefined }), ...completedPair()]).status).not.toBe('verified');
    expect(derive([evidence('bad', { result: 'incorrect', contentVersion: 'other-version' }), ...completedPair()]).status).not.toBe('verified');
  });

  it('TCP 保留当前内容版本、同轮 predict + observe 的严格契约', () => {
    const predict = evidence('predict', { nodeId: TCP_NODE_ID, contentVersion: TCP_VERSION, taskRole: 'predict' });
    const observe = evidence('observe', { nodeId: TCP_NODE_ID, contentVersion: TCP_VERSION, taskRole: 'observe' });
    expect(derive([predict, observe], TCP_NODE_ID).status).toBe('verified');
    expect(derive([predict, { ...observe, taskRole: 'predict' }], TCP_NODE_ID).status).not.toBe('verified');
    expect(derive([{ ...predict, contentVersion: 'old-tcp' }, { ...observe, contentVersion: 'old-tcp' }], TCP_NODE_ID).status).not.toBe('verified');
    expect(derive([predict, observe, evidence('extra', { nodeId: TCP_NODE_ID, contentVersion: TCP_VERSION, taskRole: 'guided' })], TCP_NODE_ID).status).not.toBe('verified');
  });
});
