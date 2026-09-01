import { evaluateAnswer } from './TeachingDecisionEngine';
import type { Question } from '../../data/v6/schemas/questionSchema';
import { MISCONCEPTIONS } from '../../data/v6/catalogs/misconceptionCatalog';

/** 误区匹配器：把一次作答映射到误区目录，并给出补救讲解句子。 */

export interface MisconceptionMatch {
  misconceptionId?: string;
  name: string;
  statement: string;
  correction: string;
  remediationPlan: string;
}

export function matchMisconception(question: Question, selected: string): MisconceptionMatch | null {
  const evaluation = evaluateAnswer(question, selected);
  if (evaluation.correct) return null;

  const entry =
    MISCONCEPTIONS.find((candidate) => candidate.id === evaluation.misconceptionId) ??
    MISCONCEPTIONS.find((candidate) => candidate.name === evaluation.misconceptionText);

  if (!entry) {
    return {
      name: '概念边界混淆',
      statement: evaluation.misconceptionText ?? '作答与正确答案不符。',
      correction: question.explanation,
      remediationPlan: '回到讲解步骤对照定义边界，然后重新作答该题。',
    };
  }

  return {
    misconceptionId: entry.id,
    name: entry.name,
    statement: entry.statement,
    correction: entry.correction,
    remediationPlan: `先阅读纠正说明，再用「${entry.relatedNodeIds[0] ? '相关节点' : '本节'}」的补救题重新检验。`,
  };
}
