import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { TransitionLink as Link, usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ArrowRight, CaretLeft, Flag } from '@phosphor-icons/react';
import { useUserStore } from '../../../store/userStore';
import { usePracticeStore } from '../../../store/practiceStore';
import { planForSession } from '../../../ai/practice/PracticePlanner';
import { contentRepository } from '../../../services/content/ContentRepository';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { PracticeSessionSummary } from '../components/PracticeSessionSummary';
import { ROUTES } from '../../../app/routes';
import { BRANCH_TO_TREE_ID } from '../../../domain/knowledge/catalog';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { getWorkspaceParent } from '../../workspace/parentNavigation';
import type { PracticeReturnContext } from '../../../store/teachingStore';
import '../practice.css';

export function PracticeSessionPage() {
  const { sessionId: legacyId, pointId, treeId, libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const learnerId = useUserStore((state) => state.activeProfileId);
  const store = usePracticeStore();
  const [error, setError] = useState('');
  const sessionId = legacyId ?? (pointId ? `node:${pointId}` : treeId ? `tree:${treeId}` : libraryId ? `library:${libraryId}` : undefined);
  const scopeNode = pointId ?? (legacyId?.startsWith('node:') ? legacyId.slice(5) : undefined);
  const branch = scopeNode ? contentRepository.getNode(scopeNode)?.branchId : undefined;
  const parent = getWorkspaceParent({ kind: 'practice', libraryId: libraryId ?? (branch ? 'computer' : undefined), treeId: treeId ?? (branch ? BRANCH_TO_TREE_ID[branch] : undefined), pointId: scopeNode });
  const plan = useMemo(() => sessionId ? planForSession(sessionId, learnerId) : null, [sessionId, learnerId]);
  useEffect(() => { if (plan && (usePracticeStore.getState().sessionId !== plan.id || usePracticeStore.getState().learnerId !== learnerId)) usePracticeStore.getState().startSession(plan.id, plan.questionIds); }, [plan, learnerId]);
  useEffect(() => { setError(''); }, [store.currentIndex]);

  const active = store.learnerId === learnerId && store.sessionId === plan?.id;
  const ids = active ? store.questionIds : [];
  const id = ids[store.currentIndex];
  const question = id ? contentRepository.getQuestion(id) : undefined;
  const answer = id ? store.answers[id] : undefined;
  const selected = answer?.selected ?? (id ? store.drafts[id] ?? '' : '');
  const answeredCount = Object.keys(store.answers).filter((answerId) => ids.includes(answerId)).length;
  const flagged = id ? store.flaggedIds.includes(id) : false;
  const isLast = store.currentIndex === ids.length - 1;
  const relatedNode = question ? contentRepository.getNode(question.nodeIds[0]) : undefined;
  const unit = relatedNode ? contentRepository.getTeachingUnitForNode(relatedNode.id) : undefined;
  const exit = () => navigate(parent.to, { state: parent.state });
  const teach = () => {
    if (!question || !unit || !store.sessionId || !store.retrySave()) return;
    const context: PracticeReturnContext = { learnerId, sessionId: store.sessionId, path: location.pathname + location.search, questionId: question.id, selected, misconceptionId: answer?.misconceptionId };
    const targetTree = treeId ?? (relatedNode ? BRANCH_TO_TREE_ID[relatedNode.branchId] : undefined);
    navigate(targetTree ? ROUTES.pointTeach(libraryId ?? 'computer', targetTree, unit.nodeId) : ROUTES.legacyTeachUnit(unit.id), { state: { practiceReturn: context } });
  };
  const next = () => {
    if (!isLast) { store.next(); return; }
    const result = store.finish();
    if (!result.ok) setError(result.missing ? `还有 ${result.missing} 道题未作答。` : '进度未保存，请重试。');
  };

  return <div className="page">
    <WorkspaceHeader title={plan?.title ?? '练习'} backLabel={scopeNode || treeId ? '返回知识树' : '返回知识库'} onBack={exit} actions={<Link className="context-nav__button" to={ROUTES.progress} state={{ returnTo: location.pathname, returnState: location.state }}>学习记录</Link>} />
    {!plan ? <main className="page__inner"><h1 className="page-title">暂无可用题目</h1><p className="page-lead">这个范围的题目不存在或已被移除。</p></main> : active && store.status === 'finished' ? <div className="page__inner"><PracticeSessionSummary plan={plan} questionIds={ids} answers={store.answers} onRestart={() => store.startSession(plan.id, plan.questionIds, true)} returnTo={parent.to} returnState={parent.state} /></div> : <div className="practice-session practice-session--focused">
      <nav className="practice-nav" aria-label="题目导航"><p className="practice-nav__kicker">本次练习 {answeredCount} / {ids.length}</p><div className="practice-nav__grid">{ids.map((questionId, index) => { const entry = store.answers[questionId]; return <button key={questionId} type="button" aria-label={`第 ${index + 1} 题${entry ? entry.correct ? '，正确' : '，错误' : '，未作答'}`} aria-current={index === store.currentIndex ? 'step' : undefined} className={`practice-nav__cell ${index === store.currentIndex ? 'is-current' : ''} ${entry ? entry.correct ? 'is-correct' : 'is-wrong' : ''}`} onClick={() => store.goTo(index)}>{index + 1}{store.flaggedIds.includes(questionId) ? '·' : ''}</button>; })}</div></nav>
      <main className="practice-stage"><div className="practice-stage__scroll">
        {(error || store.storageError) && <div className="lesson-save-error" role="alert">{error || store.storageError}{store.storageError && <button className="text-button" type="button" onClick={store.retrySave}>重试保存</button>}</div>}
        {question ? <><PracticeQuestion questionId={question.id} index={store.currentIndex} total={ids.length} selected={selected} answer={answer} onSelectChange={store.setDraft} />
          {answer && <section className="practice-answer-feedback" aria-label="作答反馈"><p className={`practice-feedback__verdict ${answer.correct ? 'is-correct' : 'is-wrong'}`}>{answer.correct ? '本题正确' : '本题未通过'}</p>{answer.correct && <p>已记录一次正确作答；是否掌握会结合后续独立任务判断。</p>}{!answer.correct && answer.misconceptionText && <p>{answer.misconceptionId ? '本次作答指向：' : '原因待确认：'}{answer.misconceptionText}</p>}<p>{question.explanation}</p>{!answer.correct && unit && <button type="button" className="text-button" onClick={teach}>看这一步的讲解 <ArrowRight size={16} /></button>}</section>}
        </> : <p>正在恢复练习。</p>}
      </div><footer className="practice-stage__footer"><div className="practice-stage__secondary"><button type="button" className="text-button text-button--ghost" onClick={() => id && store.toggleFlag(id)} disabled={!id}><Flag size={16} weight={flagged ? 'fill' : 'regular'} />{flagged ? '已标记' : '标记'}</button><button type="button" className="text-button text-button--ghost" onClick={store.prev} disabled={store.currentIndex === 0}><CaretLeft size={16} />上一题</button></div>{answer ? <button className="text-button text-button--primary" type="button" onClick={next}>{isLast ? '完成练习' : '下一题'} <ArrowRight size={16} /></button> : <button className="text-button text-button--primary" type="button" disabled={!question} onClick={() => { if (!selected.trim()) setError('先完成作答。'); else if (id && store.submitAnswer(id, selected)) setError(''); }}>提交答案 <ArrowRight size={16} /></button>}</footer></main>
    </div>}
  </div>;
}
