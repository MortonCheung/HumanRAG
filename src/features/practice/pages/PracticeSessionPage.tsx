import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CaretLeft, FlagCheckered, Flag, CheckCircle } from '@phosphor-icons/react';
import { useUserStore } from '../../../store/userStore';
import { usePracticeStore } from '../../../store/practiceStore';
import { planForSession } from '../../../ai/practice/PracticePlanner';
import { contentRepository } from '../../../services/content/ContentRepository';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { PracticeSessionSummary } from '../components/PracticeSessionSummary';
import '../practice.css';

function nodeNameOf(nodeId: string): string {
  return contentRepository.getNode(nodeId)?.name ?? nodeId;
}

export function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const learnerId = useUserStore((state) => state.activeProfileId);

  const storeSessionId = usePracticeStore((state) => state.sessionId);
  const questionIds = usePracticeStore((state) => state.questionIds);
  const currentIndex = usePracticeStore((state) => state.currentIndex);
  const answers = usePracticeStore((state) => state.answers);
  const flaggedIds = usePracticeStore((state) => state.flaggedIds);
  const status = usePracticeStore((state) => state.status);
  const startSession = usePracticeStore((state) => state.startSession);
  const submitAnswer = usePracticeStore((state) => state.submitAnswer);
  const next = usePracticeStore((state) => state.next);
  const prev = usePracticeStore((state) => state.prev);
  const goTo = usePracticeStore((state) => state.goTo);
  const toggleFlag = usePracticeStore((state) => state.toggleFlag);
  const finish = usePracticeStore((state) => state.finish);

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const plan = useMemo(() => (sessionId ? planForSession(sessionId, learnerId) : null), [sessionId, learnerId]);

  useEffect(() => {
    if (plan && plan.id !== storeSessionId) {
      startSession(plan.id, plan.questionIds);
      setSelections({});
      setError('');
    }
  }, [plan, storeSessionId, startSession]);

  useEffect(() => {
    setSelections({});
    setError('');
  }, [currentIndex]);

  if (!plan) {
    return (
      <div className="page">
        <div className="page__inner">
          <h1 className="page-title">未找到练习会话</h1>
          <p className="page-lead">这个练习会话不存在或题目已变更。</p>
          <Link className="text-button" to="/practice">
            <ArrowLeft size={14} /> 返回刷题首页
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestionId = questionIds[currentIndex];
  const currentQuestion = currentQuestionId ? contentRepository.getQuestion(currentQuestionId) : undefined;
  const currentAnswer = currentQuestionId ? answers[currentQuestionId] : undefined;
  const currentSelection = currentQuestionId ? selections[currentQuestionId] ?? '' : '';
  const isLast = currentIndex === questionIds.length - 1;
  const isFinished = status === 'finished';

  const answeredCount = Object.keys(answers).length;

  const handleSubmit = () => {
    if (!currentQuestionId) return;
    if (!currentSelection) {
      setError('请先完成作答再提交。');
      return;
    }
    submitAnswer(currentQuestionId, currentSelection);
    setError('');
  };

  const handleNext = () => {
    if (isLast) {
      const remaining = questionIds.length - answeredCount;
      if (remaining > 0) {
        setError(`还有 ${remaining} 道题未作答，请通过左侧题号继续完成。`);
        return;
      }
      finish();
    } else {
      next();
    }
  };

  const handleSelect = (questionId: string, value: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: value }));
  };

  // 结果页
  if (isFinished) {
    return (
      <div className="page">
        <div className="page__inner">
          <PracticeSessionSummary
            plan={plan}
            questionIds={questionIds}
            answers={answers}
            onRestart={() => startSession(plan.id, plan.questionIds)}
          />
        </div>
      </div>
    );
  }

  const flagged = currentQuestionId ? flaggedIds.includes(currentQuestionId) : false;
  const relatedNodeId = currentQuestion?.nodeIds[0];
  const remediationUnitId = currentQuestion?.remediationUnitId ?? (relatedNodeId ? `tu-${relatedNodeId}` : undefined);

  return (
    <div className="page">
      <div className="practice-session">
        <nav className="practice-nav" aria-label="题目导航">
          <p className="practice-nav__kicker">题目 {answeredCount}/{questionIds.length}</p>
          <div className="practice-nav__grid">
            {questionIds.map((id, index) => {
              const entry = answers[id];
              const isFlagged = flaggedIds.includes(id);
              const classes = [
                'practice-nav__cell',
                index === currentIndex ? 'is-current' : '',
                entry?.correct ? 'is-correct' : '',
                entry && !entry.correct ? 'is-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button key={id} type="button" className={classes} onClick={() => goTo(index)}>
                  {isFlagged ? '★' : index + 1}
                </button>
              );
            })}
          </div>
          <Link className="text-button text-button--ghost" to="/practice">
            <CaretLeft size={14} /> 退出
          </Link>
        </nav>

        <main className="practice-stage">
          <div className="practice-stage__scroll">
            {currentQuestion ? (
              <PracticeQuestion
                questionId={currentQuestion.id}
                index={currentIndex}
                total={questionIds.length}
                selected={currentSelection}
                answer={currentAnswer}
                onSelectChange={handleSelect}
              />
            ) : (
              <p className="practice-question__stem">题目加载失败。</p>
            )}
          </div>

          <footer className="practice-stage__footer">
            <span className="practice-stage__hint">
              {plan.title} · {plan.sourceLabel}
              {error && <span style={{ color: 'var(--it-danger)', marginLeft: 10 }}>{error}</span>}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className={`text-button text-button--ghost ${flagged ? '' : ''}`}
                onClick={() => currentQuestionId && toggleFlag(currentQuestionId)}
                disabled={!currentQuestionId}
              >
                <Flag size={14} weight={flagged ? 'fill' : 'regular'} />
                {flagged ? '已标记' : '标记'}
              </button>
              <button type="button" className="text-button text-button--ghost" onClick={prev} disabled={currentIndex === 0}>
                <CaretLeft size={14} /> 上一题
              </button>
              {!currentAnswer ? (
                <button type="button" className="text-button text-button--primary" onClick={handleSubmit}>
                  <CheckCircle size={15} weight="regular" /> 提交答案
                </button>
              ) : (
                <button type="button" className="text-button text-button--primary" onClick={handleNext}>
                  {isLast ? <FlagCheckered size={15} weight="regular" /> : <ArrowRight size={15} />}
                  {isLast ? '完成练习' : '下一题'}
                </button>
              )}
            </div>
          </footer>
        </main>

        <aside className="practice-feedback" aria-label="作答反馈">
          <div className="practice-feedback__section">
            <p className="practice-feedback__kicker">关联知识</p>
            <p className="practice-feedback__text">{relatedNodeId ? nodeNameOf(relatedNodeId) : '—'}</p>
          </div>

          {currentAnswer ? (
            <>
              <div className="practice-feedback__section">
                <p className="practice-feedback__kicker">判定</p>
                <p className={`practice-feedback__verdict ${currentAnswer.correct ? 'is-correct' : 'is-wrong'}`}>
                  {currentAnswer.correct ? '回答正确' : '回答错误'}
                </p>
                {currentAnswer.correct ? (
                  <p className="practice-feedback__text">
                    该答案证明了对应知识点的掌握情况，正确率已计入学习证据。
                  </p>
                ) : (
                  currentAnswer.misconceptionText && (
                    <p className="practice-feedback__text">错因：{currentAnswer.misconceptionText}</p>
                  )
                )}
              </div>
              <div className="practice-feedback__section">
                <p className="practice-feedback__kicker">解析</p>
                <p className="practice-feedback__text">{currentQuestion?.explanation}</p>
              </div>
              {!currentAnswer.correct && remediationUnitId && (
                <div className="practice-feedback__section">
                  <p className="practice-feedback__kicker">补救</p>
                  <Link className="practice-feedback__node" to={`/teach/${remediationUnitId}`}>
                    <span>重新讲解「{relatedNodeId ? nodeNameOf(relatedNodeId) : '知识点'}」</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="practice-feedback__section">
              <p className="practice-feedback__kicker">提示</p>
              <p className="practice-feedback__text">
                提交后这里会显示判定、错因与解析。提交前不显示答案。
              </p>
            </div>
          )}

          <div className="practice-feedback__section">
            <p className="practice-feedback__kicker">数据说明</p>
            <p className="practice-feedback__text">
              <DemoDataBadge label="本地演示数据" /> 判定由本地规则引擎实时计算。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
