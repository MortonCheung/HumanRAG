import type { Question, QuestionType } from '../../data/v6/schemas/questionSchema';
import type { TeachingStep } from '../../data/v6/schemas/teachingSchema';
import { MISCONCEPTIONS } from '../../data/v6/catalogs/misconceptionCatalog';
import { getTcpTask, evaluateTcpTask } from '../../data/v6/handcrafted/tcpLesson';

/**
 * 本地教学决策引擎（蓝图 §18）：确定性规则，不调用网络。
 * 输入是题目、学生作答与当前教学上下文，输出是评估、误区与下一步决策。
 */

export interface AnswerEvaluation {
  correct: boolean;
  /** 命中的误区目录条目 id（若可识别）。 */
  misconceptionId?: string;
  /** 面向学生的具体错因句子，来自题目的 misconceptionByAnswer。 */
  misconceptionText?: string;
}

/** 统一答案标准化：教学与刷题共用（蓝图 §12.3）。 */
export function normalizeAnswer(type: QuestionType, value: string): string {
  if (type === 'multiple-choice') {
    // 多选按集合比较：A,B 与 B,A 相同；A 与 A,B 不同。
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .sort()
      .join(',');
  }
  if (type === 'ordering') {
    // 排序保留顺序：顺序不同即错误。
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(',');
  }
  if (type === 'fill-blank' || type === 'short-answer') {
    // 文本折叠连续空白为单空格。
    return value.trim().replace(/\s+/g, ' ');
  }
  // 单选、判断、代码追踪：严格单值相等。
  return value.trim();
}

export function evaluateAnswer(question: Question, selected: string): AnswerEvaluation {
  const tcpTask = getTcpTask(question.id);
  if (tcpTask) return evaluateTcpTask(tcpTask, selected);
  const answer = question.answer;
  let correct = false;

  if (answer.kind === 'choice' || answer.kind === 'ordering') {
    const expected = normalizeAnswer(question.type, answer.optionIds.join(','));
    correct = normalizeAnswer(question.type, selected) === expected;
  } else if (answer.kind === 'boolean') {
    correct = selected === String(answer.value);
  } else {
    correct = normalizeAnswer(question.type, selected) === normalizeAnswer(question.type, answer.value);
  }

  if (correct) return { correct };

  const misconceptionText =
    question.misconceptionByAnswer[selected] ?? question.misconceptionByAnswer.default;
  const misconceptionId = MISCONCEPTIONS.find(
    (entry) => entry.name === misconceptionText || entry.correction === misconceptionText,
  )?.id;

  return { correct: false, misconceptionId, misconceptionText };
}

export interface TeachingContext {
  /** 前置诊断正确率。 */
  diagnosticScore: number;
  /** 引导练习中最近命中的误区目录 id。 */
  guidedMisconceptionId?: string;
  /** 独立检查正确率。 */
  checkScore: number;
  /** 已完成的补救轮数（独立检查重测循环，最多 2）。 */
  remediationCount?: number;
}

/** 补救耗尽后终止本轮的分支哨兵（区别于掌握完成的 'end'）。 */
export const REMEDIATION_EXHAUSTED_NEXT = 'end-remediation';

/** 按规则的声明顺序求值，取第一个命中条件；always 兜底已在 schema 层保证存在。 */
export function resolveNextStepId(step: TeachingStep, context: TeachingContext): string {
  // 补救次数达到上限且独立检查仍未通过：终止本轮，建议补前置知识（禁止无限循环）。
  if (
    step.kind === 'independent-check' &&
    context.checkScore < 0.8 &&
    (context.remediationCount ?? 0) >= 2
  ) {
    return REMEDIATION_EXHAUSTED_NEXT;
  }

  for (const rule of step.nextRules) {
    const condition = rule.condition;
    if (condition.kind === 'diagnostic-below') {
      if (context.diagnosticScore < condition.threshold) return rule.next;
    } else if (condition.kind === 'misconception-detected') {
      if (context.guidedMisconceptionId !== undefined) {
        if (!condition.misconceptionId || condition.misconceptionId === context.guidedMisconceptionId) {
          return rule.next;
        }
      }
    } else if (condition.kind === 'score-at-least') {
      if (context.checkScore >= condition.threshold) return rule.next;
    } else {
      return rule.next;
    }
  }
  // 兜底：不应到达这里（schema 保证 always 结尾）。
  const fallback = step.nextRules[step.nextRules.length - 1];
  return fallback?.next ?? 'end';
}

/** 右侧「下一步教学决策」句子：基于真实作答状态生成明确陈述。 */
export function buildDecisionSentence(input: {
  stepKind: TeachingStep['kind'];
  context: TeachingContext;
  nodeName: string;
  unitTitle: string;
  lastMisconceptionName?: string;
}): string {
  const { stepKind, context, nodeName, lastMisconceptionName } = input;
  const scorePercent = Math.round(context.diagnosticScore * 100);
  const checkPercent = Math.round(context.checkScore * 100);

  switch (stepKind) {
    case 'objective':
      return `先做三道前置诊断，确认你当前对「${nodeName}」前置知识的掌握情况，再决定从哪一视角开始讲解。`;
    case 'diagnostic':
      if (context.diagnosticScore < 0.6) {
        return `前置诊断正确率 ${scorePercent}%，低于 60%。将先进入补救讲解，补齐前置知识再开始新内容。`;
      }
      return `前置诊断正确率 ${scorePercent}%，前置知识扎实。下一步进入「${nodeName}」的三视角讲解。`;
    case 'explanation':
      return `讲解完成后，教师会用两个示范演示「${nodeName}」的标准解题顺序：先条件、再方法、后验证。`;
    case 'worked-example':
      return `示范完成。接下来做四道引导练习，每道题答错时系统会指出具体误区。`;
    case 'guided-practice':
      if (context.guidedMisconceptionId) {
        return `引导练习检测到误区「${lastMisconceptionName ?? context.guidedMisconceptionId}」。下一步切换到补救讲解，针对这个误区重新拆解。`;
      }
      return `引导练习全部通过。下一步进入独立检查，检验你能否在无提示情况下正确运用。`;
    case 'independent-check':
      if (context.checkScore >= 0.8) {
        return `独立检查正确率 ${checkPercent}%，达到掌握标准。本节总结后将写回掌握证据。`;
      }
      return `独立检查正确率 ${checkPercent}%，未达 80%。将进入补救讲解，随后重新检查。`;
    case 'remediation':
      return `补救讲解完成。将回到独立检查重新验证，连续两次通过即确认掌握。`;
    case 'summary':
      return `本节教学闭环完成：诊断、讲解、示范、练习、纠错与确认均已执行。掌握证据已写回知识图谱。`;
    default:
      return input.unitTitle;
  }
}
