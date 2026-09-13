import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { TransitionLink as Link, usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ArrowRight, CaretLeft, Flag } from '@phosphor-icons/react';
import { useUserStore } from '../../../store/userStore';
import { usePracticeStore } from '../../../store/practiceStore';
import type { PracticeMode } from '../../../store/practiceStore';
import { useProgressStore } from '../../../store/progressStore';
import { planForSession } from '../../../ai/practice/PracticePlanner';
import { contentRepository } from '../../../services/content/ContentRepository';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { PracticeSessionSummary } from '../components/PracticeSessionSummary';
import { ROUTES } from '../../../app/routes';
import { BRANCH_TO_TREE_ID } from '../../../domain/knowledge/catalog';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { getWorkspaceParent } from '../../workspace/parentNavigation';
import type { PracticeReturnContext } from '../../../store/teachingStore';
import { getTcpTask, tcpTaskResultKeys, tcpTaskSignature } from '../../../data/v6/handcrafted/tcpLesson';
import '../practice.css';

const MODE_COPY: Record<PracticeMode, { label: string; progress: string; complete: string; empty: string }> = {
  train: { label: '训练', progress: '训练进度', complete: '完成训练', empty: '这个范围还没有可用题目。' },
  verify: { label: '独立验证', progress: '验证进度', complete: '完成验证', empty: '当前没有至少两道未曝光的新题，完成补学后再回来验证。' },
  exam: { label: '考试', progress: '考试进度', complete: '交卷', empty: '当前没有足够的新题组成完整考试，请先补充题目或完成其他学习。' },
};

function questionsForMode(questionIds: string[], learnerId: string, mode: PracticeMode, answeredIds: Set<string>, exposures: ReturnType<typeof useProgressStore.getState>['taskExposures']) {
  if (mode === 'train') return questionIds;
  const fresh = questionIds.filter((questionId) => {
    const task = getTcpTask(questionId);
    if (!task) return !answeredIds.has(questionId);
    return !exposures.some((entry) => entry.learnerId === learnerId
      && (entry.signature === tcpTaskSignature(task) || tcpTaskResultKeys(task).some((key) => entry.resultKeys.includes(key))));
  });
  if (mode === 'verify') return fresh.length >= 2 ? fresh.slice(0, 12) : [];
  const counts = fresh.reduce((map, questionId) => {
    const nodeId = contentRepository.getQuestion(questionId)?.nodeIds[0];
    if (nodeId) map.set(nodeId, (map.get(nodeId) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  return fresh.filter((questionId) => {
    const nodeId = contentRepository.getQuestion(questionId)?.nodeIds[0];
    return nodeId ? (counts.get(nodeId) ?? 0) >= 2 : false;
  });
}

export function PracticeSessionPage() {
  const { sessionId: legacyId, pointId, treeId, libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const learnerId = useUserStore((state) => state.activeProfileId);
  const store = usePracticeStore();
  const answerRecords = useProgressStore((state) => state.answerRecords);
  const taskExposures = useProgressStore((state) => state.taskExposures);
  const [error, setError] = useState('');
  const sessionId = legacyId ?? (pointId ? `node:${pointId}` : treeId ? `tree:${treeId}` : libraryId ? `library:${libraryId}` : undefined);
  const scopeNode = pointId ?? (legacyId?.startsWith('node:') ? legacyId.slice(5) : undefined);
  const branch = scopeNode ? contentRepository.getNode(scopeNode)?.branchId : undefined;
  const parent = getWorkspaceParent({ kind: 'practice', libraryId: libraryId ?? (branch ? 'computer' : undefined), treeId: treeId ?? (branch ? BRANCH_TO_TREE_ID[branch] : undefined), pointId: scopeNode });
  const plan = useMemo(() => sessionId ? planForSession(sessionId, learnerId) : null, [sessionId, learnerId]);
  const mode: PracticeMode = pointId ? (location.pathname.endsWith('/verify') ? 'verify' : 'train') : legacyId ? (legacyId.startsWith('paper:') ? 'exam' : 'train') : 'exam';
  const availableQuestionIds = useMemo(() => questionsForMode(plan?.questionIds ?? [], learnerId, mode, new Set(answerRecords.filter((entry) => entry.learnerId === learnerId).map((entry) => entry.questionId)), taskExposures), [answerRecords, learnerId, mode, plan, taskExposures]);
  const resumable = Object.values(store.sessions).some((session) => session.learnerId === learnerId && session.sessionId === plan?.id && session.mode === mode && session.status === 'active');
  useEffect(() => {
    const current = usePracticeStore.getState();
    if (plan && (availableQuestionIds.length > 0 || resumable) && (current.sessionId !== plan.id || current.learnerId !== learnerId || current.mode !== mode)) {
      current.startSession(plan.id, availableQuestionIds, { mode });
    }
  }, [availableQuestionIds, learnerId, mode, plan, resumable]);
  useEffect(() => { setError(''); }, [store.currentIndex]);

  const active = store.learnerId === learnerId && store.sessionId === plan?.id && store.mode === mode;
  const ids = active ? store.questionIds : [];
  const id = ids[store.currentIndex];
  const question = id ? contentRepository.getQuestion(id) : undefined;
  const answer = id ? store.answers[id] : undefined;
  const selected = answer?.selected ?? (id ? store.drafts[id] ?? '' : '');
  const answeredCount = Object.keys(store.answers).filter((answerId) => ids.includes(answerId)).length;
  const flagged = id ? store.flaggedIds.includes(id) : false;
  const isLast = store.currentIndex === ids.length - 1;
  const copy = MODE_COPY[mode];
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
    <WorkspaceHeader title={plan ? `${copy.label} · ${plan.title}` : copy.label} backLabel={scopeNode || treeId ? '返回知识树' : '返回知识库'} onBack={exit} actions={<Link className="context-nav__button" to={ROUTES.progress} state={{ returnTo: location.pathname, returnState: location.state }}>学习证据</Link>} />
    {!plan ? <main className="page__inner"><h1 className="page-title">暂无可用题目</h1><p className="page-lead">这个范围的题目不存在或已被移除。</p></main> : !active && availableQuestionIds.length === 0 && !resumable ? <main className="page__inner practice-empty"><p className="panel-kicker">{copy.label}</p><h1 className="page-title">暂时无法开始</h1><p className="page-lead">{copy.empty}</p><button className="text-button text-button--primary" type="button" onClick={exit}>返回知识树</button></main> : active && store.status === 'finished' ? <div className="page__inner"><PracticeSessionSummary plan={plan} questionIds={ids} answers={store.answers} mode={mode} canRestart={mode === 'train' || availableQuestionIds.length > 0} onRestart={() => store.startSession(plan.id, availableQuestionIds, { restart: true, mode })} returnTo={parent.to} returnState={parent.state} /></div> : <div className="practice-session practice-session--focused">
      <nav className="practice-nav" aria-label="题目导航"><p className="practice-nav__kicker">{copy.progress} {answeredCount} / {ids.length}</p><div className="practice-nav__grid">{ids.map((questionId, index) => { const entry = store.answers[questionId]; const resultClass = mode === 'train' && entry ? entry.correct ? 'is-correct' : 'is-wrong' : entry ? 'is-recorded' : ''; const stateLabel = entry ? mode === 'train' ? entry.correct ? '，正确' : '，错误' : '，已记录' : '，未作答'; return <button key={questionId} type="button" aria-label={`第 ${index + 1} 题${stateLabel}`} aria-current={index === store.currentIndex ? 'step' : undefined} className={`practice-nav__cell ${index === store.currentIndex ? 'is-current' : ''} ${resultClass}`} onClick={() => store.goTo(index)}>{index + 1}{store.flaggedIds.includes(questionId) ? '·' : ''}</button>; })}</div></nav>
      <main className="practice-stage"><div className="practice-stage__scroll">
        {(error || store.storageError) && <div className="lesson-save-error" role="alert">{error || store.storageError}{store.storageError && <button className="text-button" type="button" onClick={store.retrySave}>重试保存</button>}</div>}
        {question ? <><PracticeQuestion questionId={question.id} index={store.currentIndex} total={ids.length} selected={selected} answer={answer} revealResult={mode === 'train'} onSelectChange={store.setDraft} />
          {answer && mode === 'train' && <section className="practice-answer-feedback" aria-label="作答反馈"><p className={`practice-feedback__verdict ${answer.correct ? 'is-correct' : 'is-wrong'}`}>{answer.correct ? '本题正确' : '本题未通过'}</p>{answer.correct && <p>已记录一次正确作答；是否掌握会结合后续独立任务判断。</p>}{!answer.correct && answer.misconceptionText && <p>{answer.misconceptionId ? '本次作答指向：' : '原因待确认：'}{answer.misconceptionText}</p>}<p>{question.explanation}</p>{!answer.correct && unit && <button type="button" className="text-button" onClick={teach}>看这一步的讲解 <ArrowRight size={16} /></button>}</section>}
          {answer && mode !== 'train' && <p className="practice-answer-recorded" role="status"><strong>已记录</strong><span>本轮结束后统一查看答案与结果。</span></p>}
        </> : <p>正在恢复练习。</p>}
      </div><footer className="practice-stage__footer"><div className="practice-stage__secondary"><button type="button" className="text-button text-button--ghost" onClick={() => id && store.toggleFlag(id)} disabled={!id}><Flag size={16} weight={flagged ? 'fill' : 'regular'} />{flagged ? '已标记' : '标记'}</button><button type="button" className="text-button text-button--ghost" onClick={store.prev} disabled={store.currentIndex === 0}><CaretLeft size={16} />上一题</button></div>{answer ? <button className="text-button text-button--primary" type="button" onClick={next}>{isLast ? copy.complete : '下一题'} <ArrowRight size={16} /></button> : <button className="text-button text-button--primary" type="button" disabled={!question} onClick={() => { if (!selected.trim()) setError('先完成作答。'); else if (id && store.submitAnswer(id, selected)) setError(''); }}>提交答案 <ArrowRight size={16} /></button>}</footer></main>
    </div>}
  </div>;
}
