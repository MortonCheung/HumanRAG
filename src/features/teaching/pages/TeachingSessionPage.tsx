import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { useTeachingStore, type SessionAnswer } from '../../../store/teachingStore';
import { buildDecisionSentence, type TeachingContext } from '../../../ai/teaching/TeachingDecisionEngine';
import { contentRepository } from '../../../services/content/ContentRepository';
import { TeachingStepRail } from '../components/TeachingStepRail';
import { ContentBlockView } from '../components/ContentBlockView';
import { QuestionCard } from '../components/QuestionCard';
import { TeachingCompletionEvidence } from '../components/TeachingCompletionEvidence';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import '../teaching.css';

const STEP_KIND_LABELS: Record<string, string> = {
  objective: '学习目标',
  diagnostic: '前置诊断',
  explanation: '概念讲解',
  'worked-example': '教师示范',
  'guided-practice': '引导练习',
  'independent-check': '独立检查',
  remediation: '纠错复教',
  summary: '总结确认',
};

function nodeNameOf(nodeId: string): string {
  return contentRepository.getNode(nodeId)?.name ?? nodeId;
}

/** 由会话作答推导决策上下文（与决策引擎保持同一口径，独立检查只统计当前 attempt）。 */
function contextOf(answers: SessionAnswer[], attempt: number): TeachingContext {
  const diagnostic = answers.filter((entry) => entry.stepKind === 'diagnostic');
  const guided = answers.filter((entry) => entry.stepKind === 'guided-practice');
  const check = answers.filter((entry) => entry.stepKind === 'independent-check' && entry.attempt === attempt);
  return {
    diagnosticScore: diagnostic.length > 0 ? diagnostic.filter((entry) => entry.correct).length / diagnostic.length : 1,
    guidedMisconceptionId: guided.find((entry) => !entry.correct)?.misconceptionId,
    checkScore: check.length > 0 ? check.filter((entry) => entry.correct).length / check.length : 0,
  };
}

export function TeachingSessionPage() {
  const { unitId: routeUnitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();

  const unitId = useTeachingStore((state) => state.unitId);
  const currentStepId = useTeachingStore((state) => state.currentStepId);
  const status = useTeachingStore((state) => state.status);
  const answers = useTeachingStore((state) => state.answers);
  const completedStepIds = useTeachingStore((state) => state.completedStepIds);
  const attempt = useTeachingStore((state) => state.attempt);
  const outcome = useTeachingStore((state) => state.outcome);
  const startSession = useTeachingStore((state) => state.startSession);
  const submitCurrentStep = useTeachingStore((state) => state.submitCurrentStep);
  const advance = useTeachingStore((state) => state.advance);
  const resetSession = useTeachingStore((state) => state.resetSession);

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const routeUnit = routeUnitId ? contentRepository.getTeachingUnit(routeUnitId) : undefined;

  // 路由指向的教学单元与当前会话不一致时，开启新会话；一致时恢复进行中的会话。
  useEffect(() => {
    if (routeUnitId && routeUnit && routeUnitId !== unitId) {
      startSession(routeUnitId);
      setSelections({});
      setError('');
    }
  }, [routeUnitId, routeUnit, unitId, startSession]);

  useEffect(() => {
    setSelections({});
    setError('');
  }, [currentStepId]);

  const unit = unitId ? contentRepository.getTeachingUnit(unitId) : undefined;
  const step = currentStepId ? contentRepository.getTeachingStep(currentStepId) : undefined;
  const questionIds = useMemo(() => step?.questionIds ?? [], [step]);

  const submittedCount = questionIds.filter((id) =>
    answers.some((entry) => entry.questionId === id && entry.stepId === currentStepId && entry.attempt === attempt),
  ).length;
  const stepSubmitted = questionIds.length > 0 && submittedCount === questionIds.length;
  const canAdvance = questionIds.length === 0 || stepSubmitted;

  const decision = useMemo(() => {
    if (!unit || !step) return '';
    const context = contextOf(answers, attempt);
    const lastMisconceptionName = [...answers].reverse().find((entry) => entry.misconceptionText)?.misconceptionText;
    return buildDecisionSentence({
      stepKind: step.kind,
      context,
      nodeName: nodeNameOf(unit.nodeId),
      unitTitle: unit.title,
      lastMisconceptionName,
    });
  }, [unit, step, answers, attempt]);

  const metrics = useMemo(() => {
    const context = contextOf(answers, attempt);
    return [
      { label: '前置诊断正确率', value: answers.some((entry) => entry.stepKind === 'diagnostic') ? `${Math.round(context.diagnosticScore * 100)}%` : '未开始' },
      { label: '引导练习正确率', value: answers.some((entry) => entry.stepKind === 'guided-practice') ? `${Math.round((answers.filter((e) => e.stepKind === 'guided-practice' && e.correct).length / Math.max(1, answers.filter((e) => e.stepKind === 'guided-practice').length)) * 100)}%` : '未开始' },
      { label: '独立检查正确率', value: answers.some((entry) => entry.stepKind === 'independent-check' && entry.attempt === attempt) ? `${Math.round(context.checkScore * 100)}%` : '未开始' },
      { label: '累计作答', value: `${answers.length} 题` },
    ];
  }, [answers, attempt]);

  if (!routeUnit) {
    return (
      <div className="page">
        <div className="page__inner">
          <h1 className="page-title">未找到教学单元</h1>
          <p className="page-lead">这个教学单元不存在或已被移除。</p>
          <Link className="nav-tool" to="/teach">
            <ArrowLeft size={14} /> 返回教学首页
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    const result = submitCurrentStep(selections);
    if (!result.ok) {
      setError(`还有 ${result.missing} 道题未作答，完成全部作答后再提交。`);
    } else {
      setError('');
    }
  };

  const handleAdvance = () => {
    if (!canAdvance) return;
    advance();
  };

  const handleFinish = () => {
    resetSession();
    navigate('/teach');
  };

  const handleRestart = () => {
    if (unitId) startSession(unitId);
  };

  return (
    <div className="page">
      <div className="teach-session">
        <TeachingStepRail />

        <main className="teach-stage">
          <div className="teach-stage__scroll">
            {status === 'finished' ? (
              <TeachingCompletionEvidence
                unit={unit ?? routeUnit}
                answers={answers}
                completedStepIds={completedStepIds}
                outcome={outcome}
                onFinish={handleFinish}
                onRestart={handleRestart}
              />
            ) : step && unit ? (
              <section className="stage-block">
                <p className="stage-block__kicker">
                  {unit.title} · {STEP_KIND_LABELS[step.kind] ?? step.title}
                  {step.kind === 'independent-check' && attempt > 1 ? ` · 第 ${attempt} 次检查` : ''}
                </p>
                <h2 className="stage-block__title">{step.title}</h2>
                <div className="stage-block__body">
                  {step.bodyBlocks.map((block, index) => (
                    <ContentBlockView key={`${step.id}-${block.kind}-${index}`} block={block} />
                  ))}
                </div>
                {questionIds.length > 0 && (
                  <div className="stage-block__body" style={{ marginTop: 8 }}>
                    {questionIds.map((questionId, index) => (
                      <QuestionCard
                        key={questionId}
                        questionId={questionId}
                        index={index}
                        onSelectionChange={(id, selected) =>
                          setSelections((prev) => ({ ...prev, [id]: selected }))
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="stage-block">
                <p className="stage-block__kicker">教学会话</p>
                <h2 className="stage-block__title">准备开始</h2>
                <div className="stage-block__body">
                  <p>会话尚未开始。返回教学首页选择一个教学单元。</p>
                </div>
              </section>
            )}
          </div>

          {status !== 'finished' && step && (
            <footer className="teach-stage__footer">
              <span className="teach-stage__hint">
                {questionIds.length > 0
                  ? stepSubmitted
                    ? `本步骤 ${questionIds.length} 道题已全部提交。`
                    : `已作答 ${submittedCount}/${questionIds.length} 题。`
                  : '阅读完成后进入下一步。'}
                {error && <span style={{ color: 'var(--it-danger)', marginLeft: 10 }}>{error}</span>}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                {questionIds.length > 0 && !stepSubmitted && (
                  <button type="button" className="text-button text-button--primary" onClick={handleSubmit}>
                    <CheckCircle size={15} weight="regular" /> 提交答案
                  </button>
                )}
                <button type="button" className="text-button text-button--ghost" onClick={handleAdvance} disabled={!canAdvance}>
                  下一步 <ArrowRight size={14} />
                </button>
              </div>
            </footer>
          )}
        </main>

        <aside className="evidence-panel" aria-label="教学决策与证据">
          <div className="evidence-panel__section">
            <p className="evidence-panel__kicker">下一步教学决策</p>
            <p className="evidence-panel__text evidence-panel__decision">{decision || '开始教学后，这里会显示系统对下一步的教学判断。'}</p>
          </div>
          <div className="evidence-panel__section">
            <p className="evidence-panel__kicker">本节课证据</p>
            {answers.length > 0 ? (
              <ul className="evidence-panel__list">
                {answers.slice(-6).map((entry) => (
                  <li key={`${entry.questionId}-${entry.selected}`}>
                    {entry.correct ? '✓' : '✗'} {entry.stepKind === 'diagnostic' ? '前置诊断' : entry.stepKind === 'guided-practice' ? '引导练习' : '独立检查'}
                    {entry.misconceptionText ? ` · ${entry.misconceptionText}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="evidence-panel__text">尚无作答记录。提交第一组题目后，这里会显示逐题证据。</p>
            )}
          </div>
          <div className="evidence-panel__section">
            <p className="evidence-panel__kicker">掌握指标</p>
            {metrics.map((metric) => (
              <p className="evidence-panel__metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </p>
            ))}
          </div>
          <div className="evidence-panel__section">
            <p className="evidence-panel__kicker">数据说明</p>
            <p className="evidence-panel__text">
              <DemoDataBadge label="本地演示数据" /> 教学决策由本地规则引擎根据作答实时计算，不调用网络。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
