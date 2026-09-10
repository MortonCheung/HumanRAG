import { ArrowRight, Repeat } from '@phosphor-icons/react';
import { TransitionLink as Link } from '../../../app/pageNavigation';
import type { PracticePlan } from '../../../ai/practice/PracticePlanner';
import { MasteryCelebration } from '../../../components/feedback/MasteryCelebration';
import { contentRepository } from '../../../services/content/ContentRepository';
import type { PracticeAnswer } from '../../../store/practiceStore';

interface PracticeSessionSummaryProps {
  plan: PracticePlan;
  questionIds: string[];
  answers: Record<string, PracticeAnswer>;
  onRestart: () => void;
  returnTo: string;
  returnState?: unknown;
}

function nodeNameOf(nodeId: string): string {
  return contentRepository.getNode(nodeId)?.name ?? nodeId;
}

export function PracticeSessionSummary({ plan, questionIds, answers, onRestart, returnTo, returnState }: PracticeSessionSummaryProps) {
  const resultRows = questionIds
    .map((questionId) => ({ question: contentRepository.getQuestion(questionId), answer: answers[questionId] }))
    .filter((entry) => entry.question && entry.answer);
  const correctCount = resultRows.filter((entry) => entry.answer?.correct).length;
  const accuracy = questionIds.length > 0 ? Math.round((correctCount / questionIds.length) * 100) : 0;
  const wrongRows = resultRows.filter((entry) => !entry.answer?.correct);

  const reasons = Array.from(
    wrongRows.reduce((groups, entry) => {
      const reason = entry.answer?.misconceptionText || '未命中具体误区';
      groups.set(reason, (groups.get(reason) ?? 0) + 1);
      return groups;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  const nodeCounts = wrongRows.reduce((groups, entry) => {
    const nodeId = entry.question?.nodeIds[0];
    if (nodeId) groups.set(nodeId, (groups.get(nodeId) ?? 0) + 1);
    return groups;
  }, new Map<string, number>());
  const recommendedNodeId =
    Array.from(nodeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? resultRows[0]?.question?.nodeIds[0];
  const recommendedQuestion = wrongRows.find((entry) => entry.question?.nodeIds.includes(recommendedNodeId ?? ''))?.question
    ?? resultRows[0]?.question;
  const remediationUnitId = recommendedQuestion?.remediationUnitId
    ?? (recommendedNodeId ? `tu-${recommendedNodeId}` : undefined);
  const recommendedNodeName = recommendedNodeId ? nodeNameOf(recommendedNodeId) : '当前知识点';

  return (
    <section className="practice-result" aria-labelledby="practice-result-title">
      <header className="practice-result__header">
        <MasteryCelebration label={`${plan.title}完成`} compact />
        <div>
          <p className="panel-kicker">练习完成</p>
          <h1 className="page-title" id="practice-result-title">{plan.title}</h1>
          <p className="practice-result__meta">作答证据已写回学习记录，掌握度和误区记录已同步更新。</p>
        </div>
      </header>

      <div className="practice-result__score-row">
        <div>
          <strong className="practice-result__score">{accuracy}%</strong>
          <span>正确率</span>
        </div>
        <div><strong>{correctCount}</strong><span>回答正确</span></div>
        <div><strong>{questionIds.length - correctCount}</strong><span>回答错误</span></div>
        <div><strong>{questionIds.length}</strong><span>本次题量</span></div>
      </div>
      <div className="practice-result__bar" aria-label={`正确率 ${accuracy}%`}>
        <div className="practice-result__bar-fill" style={{ width: `${accuracy}%` }} />
      </div>

      <div className="practice-result__detail-grid">
        <section className="practice-result__section">
          <p className="panel-kicker">错因分布</p>
          {reasons.length > 0 ? (
            <div className="mistake-distribution">
              {reasons.map(([reason, count]) => (
                <div className="mistake-distribution__row" key={reason}>
                  <div><span>{reason}</span><strong>{count} 题</strong></div>
                  <span className="mistake-distribution__track" aria-hidden="true">
                    <span style={{ width: `${Math.round((count / wrongRows.length) * 100)}%` }} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="practice-result__empty">本次没有错误项，未发现新的误区。</p>
          )}
        </section>

        <section className="practice-result__section practice-result__recommendation">
          <p className="panel-kicker">建议补学</p>
          <h2>{recommendedNodeName}</h2>
          <p>
            {wrongRows.length > 0
              ? `本次错误最集中在「${recommendedNodeName}」。先完成对应教学单元，再重做错题，确认误区已经关闭。`
              : `本轮未发现新误区。可回看「${recommendedNodeName}」的总结与适用边界，再进入更高难度练习。`}
          </p>
          {remediationUnitId && (
            <Link className="text-button text-button--primary" to={`/teach/${remediationUnitId}`}>
              去教学 <ArrowRight size={14} />
            </Link>
          )}
        </section>
      </div>

      <footer className="practice-result__actions">
        <Link className="text-button text-button--ghost" to={returnTo} state={returnState}>返回上一级</Link>
        <button className="text-button text-button--ghost" type="button" onClick={onRestart}>
          <Repeat size={14} /> 再练一遍
        </button>
      </footer>
    </section>
  );
}
