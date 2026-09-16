import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ArrowRight } from '@phosphor-icons/react';
import { useTeachingStore } from '../../../store/teachingStore';
import { contentRepository } from '../../../services/content/ContentRepository';
import { TeachingStepRail } from '../components/TeachingStepRail';
import { ContentBlockView } from '../components/ContentBlockView';
import { QuestionCard } from '../components/QuestionCard';
import { TeachingCompletionEvidence } from '../components/TeachingCompletionEvidence';
import { TcpLesson } from '../components/TcpLesson';
import { TCP_UNIT_ID } from '../../../data/v6/handcrafted/tcpLesson';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { getWorkspaceParent } from '../../workspace/parentNavigation';
import { BRANCH_TO_TREE_ID } from '../../../domain/knowledge/catalog';
import { buildDecisionSentence, type TeachingContext } from '../../../ai/teaching/TeachingDecisionEngine';
import { MISCONCEPTIONS } from '../../../data/v6/catalogs/misconceptionCatalog';
import { teachingPhaseIndex } from '../components/TeachingStepRail';
import '../teaching.css';
import '../tcp-lesson.css';

export function TeachingSessionPage() {
  const { unitId, pointId, libraryId, treeId } = useParams();
  const routeUnitId = unitId ?? (pointId ? contentRepository.getTeachingUnitForNode(pointId)?.id : undefined);
  const unit = routeUnitId ? contentRepository.getTeachingUnit(routeUnitId) : undefined;
  const branch = unit ? contentRepository.getNode(unit.nodeId)?.branchId : undefined;
  const parent = getWorkspaceParent({ kind: 'learn', libraryId: libraryId ?? (branch ? 'computer' : undefined), treeId: treeId ?? (branch ? BRANCH_TO_TREE_ID[branch] : undefined), pointId });
  return routeUnitId === TCP_UNIT_ID ? <TcpLesson parent={parent} /> : <StandardTeachingSession routeUnitId={routeUnitId} parent={parent} />;
}

/** Existing content remains available without claiming the full TCP teaching capability. */
function StandardTeachingSession({ routeUnitId, parent }: { routeUnitId?: string; parent: { to: string; state?: unknown } }) {
  const scrollPane = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const store = useTeachingStore();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const routeUnit = routeUnitId ? contentRepository.getTeachingUnit(routeUnitId) : undefined;
  const unit = store.unitId ? contentRepository.getTeachingUnit(store.unitId) : undefined;
  const step = store.currentStepId ? contentRepository.getTeachingStep(store.currentStepId) : undefined;
  const questionIds = step?.questionIds ?? [];
  const submitted = questionIds.length > 0 && questionIds.every((id) => store.answers.some((entry) => entry.questionId === id && entry.stepId === step?.id && entry.attempt === store.attempt));
  const diagnosticAnswers = store.answers.filter((entry) => entry.stepKind === 'diagnostic');
  const guidedAnswers = store.answers.filter((entry) => entry.stepKind === 'guided-practice');
  const checkAnswers = store.answers.filter((entry) => entry.stepKind === 'independent-check' && entry.attempt === store.attempt);
  const context: TeachingContext = {
    diagnosticScore: diagnosticAnswers.length ? diagnosticAnswers.filter((entry) => entry.correct).length / diagnosticAnswers.length : 1,
    guidedMisconceptionId: guidedAnswers.find((entry) => !entry.correct)?.misconceptionId,
    checkScore: checkAnswers.length ? checkAnswers.filter((entry) => entry.correct).length / checkAnswers.length : 0,
    remediationCount: store.remediationCount,
  };
  const misconceptionName = context.guidedMisconceptionId ? MISCONCEPTIONS.find((entry) => entry.id === context.guidedMisconceptionId)?.name : undefined;
  const nodeName = unit ? contentRepository.getNode(unit.nodeId)?.name ?? unit.title : routeUnit?.title ?? '当前知识点';
  const decision = step && unit ? (step.kind === 'summary' && store.incompleteStepIds.length > 0
    ? '你可以继续浏览总结；未提交的题目不会生成掌握证据，本轮只记录为未完成。'
    : !submitted && step.kind === 'diagnostic'
    ? `先用当前诊断题定位「${nodeName}」的前置缺口，作答前不提供讲解。`
    : !submitted && step.kind === 'guided-practice'
      ? '现在把刚才的示范迁移到新条件；答错时只定位具体误区，再决定是否补教。'
      : !submitted && step.kind === 'independent-check'
        ? `现在移除提示，用新题确认你能否独立运用「${nodeName}」。`
        : buildDecisionSentence({ stepKind: step.kind, context, nodeName, unitTitle: unit.title, lastMisconceptionName: misconceptionName })) : '';
  const exit = () => navigate(parent.to, { state: parent.state });

  useEffect(() => { if (routeUnitId && routeUnit && routeUnitId !== useTeachingStore.getState().unitId) useTeachingStore.getState().startSession(routeUnitId); }, [routeUnitId, routeUnit]);
  useEffect(() => { setSelections({}); setError(''); if (scrollPane.current) scrollPane.current.scrollTop = 0; }, [store.currentStepId, store.attempt]);

  return <div className="page">
    <WorkspaceHeader title={routeUnit ? `${routeUnit.title} · 带我学` : '带我学'} backLabel="返回知识树" onBack={exit} />
    {!routeUnit ? <main className="page__inner"><h1 className="page-title">暂未提供教学内容</h1><p className="page-lead">这个知识点的教学内容不存在或已被移除。</p></main> : <div className="teach-session teach-session--focused">
      <TeachingStepRail />
      <main className="teach-stage"><div className="teach-stage__scroll" ref={scrollPane}>
        {store.storageError && <p className="lesson-save-error" role="alert">{store.storageError}</p>}
        {store.status === 'finished' ? <TeachingCompletionEvidence unit={unit ?? routeUnit} answers={store.answers} completedStepIds={store.completedStepIds} outcome={store.outcome} onFinish={exit} onRestart={() => store.startSession(routeUnit.id)} /> : step && unit ? <section className="stage-block">
          <p className="stage-block__kicker">第 {teachingPhaseIndex(step.kind) + 1} 阶段 · {step.kind === 'independent-check' ? `第 ${store.attempt} 次独立验证` : unit.title}</p>
          <h1 className="stage-block__title">{step.title}</h1>
          <div className="teach-decision" role="note"><span>为什么现在做这一步</span><p>{decision}</p></div>
          <div className="stage-block__body">{step.bodyBlocks.map((block, index) => <ContentBlockView key={`${step.id}-${index}`} block={block} />)}
            {questionIds.map((id, index) => <QuestionCard key={`${id}-${store.attempt}`} questionId={id} index={index} onSelectionChange={(questionId, selected) => setSelections((current) => ({ ...current, [questionId]: selected }))} />)}
          </div>
        </section> : <p>正在恢复本次学习。</p>}
      </div>
      {store.status !== 'finished' && step && <footer className="teach-stage__footer"><span className="teach-stage__hint" role={error ? 'alert' : undefined}>{error || (submitted ? '本步作答已记录' : '')}</span>{questionIds.length > 0 && !submitted ? <div><button className="text-button text-button--ghost" type="button" onClick={() => { setError(''); store.advance(); }}>下一步 <ArrowRight size={16} /></button><button className="text-button text-button--primary" type="button" onClick={() => { const result = store.submitCurrentStep(selections); setError(result.ok ? '' : result.missing ? `还有 ${result.missing} 道题未作答。` : '记录未保存，请重试。'); }}>提交答案</button></div> : <button className="text-button text-button--primary" type="button" onClick={store.advance}>下一步 <ArrowRight size={16} /></button>}</footer>}
      </main>
    </div>}
  </div>;
}
