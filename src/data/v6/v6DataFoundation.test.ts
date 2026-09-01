import { describe, expect, it } from 'vitest';
import { QuestionSchema } from './schemas/questionSchema';
import { TeachingUnitSchema, TeachingStepSchema } from './schemas/teachingSchema';
import { DemoHistorySchema } from './schemas/progressSchema';
import {
  getQuestion,
  listQuestionIdsByBranch,
  QUESTION_COUNTS,
  MOCK_PAPERS,
} from './generators/generateQuestionVariants';
import {
  TEACHING_UNITS,
  TEACHING_STEPS,
  TEACHING_STEPS_BY_ID,
  TEACHING_UNIT_COUNT,
} from './generators/generateTeachingUnit';
import { DEMO_HISTORY, DEMO_HISTORY_COUNTS } from './generators/generateDemoHistory';

const ALL_BRANCHES = ['408', 'ai', 'game', 'frontend', 'university'] as const;

describe('v6 数据基础：题库', () => {
  it('题目总量达到 4,336（480 蓝图 × 8 变式 + 336 诊断 + 160 补救）', () => {
    expect(QUESTION_COUNTS.blueprintVariants).toBe(3_840);
    expect(QUESTION_COUNTS.diagnostic).toBe(336);
    expect(QUESTION_COUNTS.remediation).toBe(160);
    expect(QUESTION_COUNTS.total).toBe(4_336);
  });

  it('全部题目可物化且通过 schema 校验，不存在无答案题', () => {
    const ids = ALL_BRANCHES.flatMap((branch) => listQuestionIdsByBranch(branch));
    expect(ids.length).toBe(4_336);
    expect(new Set(ids).size).toBe(4_336);
    for (const id of ids) {
      const question = getQuestion(id);
      expect(question, `题目缺失：${id}`).toBeDefined();
      const parsed = QuestionSchema.safeParse(question);
      if (!parsed.success) {
        throw new Error(`题目校验失败：${id} -> ${parsed.error.issues[0]?.message}`);
      }
    }
  });

  it('同一 seed 两次物化结果一致', () => {
    const first = getQuestion('qbp-deep-knowledge-linear-list#3');
    const second = getQuestion('qbp-deep-knowledge-linear-list#3');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('24 套模拟试卷，每套 40 题', () => {
    expect(MOCK_PAPERS).toHaveLength(24);
    for (const paper of MOCK_PAPERS) {
      expect(paper.questionIds).toHaveLength(40);
      expect(new Set(paper.questionIds).size).toBe(40);
    }
  });
});

describe('v6 数据基础：教学单元', () => {
  it('336 个教学单元，全部通过 schema 校验', () => {
    expect(TEACHING_UNIT_COUNT).toBe(336);
    for (const unit of TEACHING_UNITS) {
      const parsed = TeachingUnitSchema.safeParse(unit);
      if (!parsed.success) {
        throw new Error(`单元校验失败：${unit.id} -> ${parsed.error.issues[0]?.message}`);
      }
    }
  });

  it('不存在无下一步规则的教学步骤，且 always 兜底在最后', () => {
    expect(TEACHING_STEPS.length).toBe(336 * 8);
    for (const step of TEACHING_STEPS) {
      const parsed = TeachingStepSchema.safeParse(step);
      if (!parsed.success) {
        throw new Error(`步骤校验失败：${step.id} -> ${parsed.error.issues[0]?.message}`);
      }
      expect(step.nextRules.length).toBeGreaterThanOrEqual(1);
      expect(step.nextRules[step.nextRules.length - 1].condition.kind).toBe('always');
    }
  });

  it('每个单元的步骤 id 均可索引', () => {
    for (const unit of TEACHING_UNITS) {
      for (const stepId of unit.stepIds) {
        expect(TEACHING_STEPS_BY_ID.has(stepId), `缺少步骤：${stepId}`).toBe(true);
      }
    }
  });
});

describe('v6 数据基础：演示学习记录', () => {
  it('演示记录数量与 schema 均符合蓝图要求', () => {
    expect(DEMO_HISTORY_COUNTS.profiles).toBe(24);
    expect(DEMO_HISTORY_COUNTS.answerRecords).toBe(1_200);
    expect(DEMO_HISTORY_COUNTS.evidenceRecords).toBe(380);
    expect(DEMO_HISTORY_COUNTS.misconceptionRecords).toBe(96);
    expect(DEMO_HISTORY_COUNTS.remediationTasks).toBe(28);
    const parsed = DemoHistorySchema.safeParse(DEMO_HISTORY);
    if (!parsed.success) {
      throw new Error(`演示记录校验失败：${parsed.error.issues[0]?.message}`);
    }
  });
});
