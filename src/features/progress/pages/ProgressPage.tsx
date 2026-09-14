import { useMemo } from 'react';
import { TransitionLink as Link, usePageNavigate } from '../../../app/pageNavigation';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { useUserStore } from '../../../store/userStore';
import { useProgressStore } from '../../../store/progressStore';
import { contentRepository } from '../../../services/content/ContentRepository';
import { TCP_FRAGMENTS, TCP_REASONS, TCP_VERSION } from '../../../data/v6/handcrafted/tcpLesson';
import { MISCONCEPTIONS_BY_ID } from '../../../data/v6/catalogs/misconceptionCatalog';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import type { EvidenceRecord } from '../../../data/v6/schemas/progressSchema';
import { deriveLearningStateFromEvidence, type LearningState } from '../../../domain/learning/deriveLearningState';
import { BRANCH_TO_TREE_ID } from '../../../domain/knowledge/catalog';
import { ROUTES } from '../../../app/routes';
import { getLearningRecommendation } from '../../../ai/learningRecommendation';
import { useLearningQuestionStore } from '../../../domain/learning/learningQuestions';
import '../progress.css';

const SOURCE = { diagnostic: '尝试', 'guided-practice': '练习', 'independent-check': '测验', practice: '练习' };
const HELP = { independent: '无提示', hint: '使用提示', demonstration: '示范后完成', unknown: '帮助情况未知' };
function formatResponse(value: string) {
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed.values)) return `${parsed.values.join('、')}；${TCP_REASONS.find((reason) => reason.id === parsed.reason)?.text ?? '未记录理由'}`; } catch { /* Old snapshots may contain plain text. */ }
  return value;
}

function EvidenceEntry({ record }: { record: EvidenceRecord }) {
  const fragment = Object.values(TCP_FRAGMENTS).find((item) => item.id === record.fragmentId);
  return <article className="learning-record">
    <div className="learning-record__heading"><div><strong>{contentRepository.getNode(record.nodeId)?.name ?? record.nodeId}</strong><span>{SOURCE[record.source]} · {record.result === 'correct' ? '正确' : record.result === 'partial' ? '部分正确' : '需巩固'} · {HELP[record.assistance ?? 'unknown']}{record.firstExposure === false ? ' · 已曝光任务' : record.firstExposure === true ? ' · 首次任务' : ''}</span></div><time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></div>
    {record.snapshot && <details><summary>查看作答与依据</summary><div className="learning-record__snapshot"><p>{record.snapshot.stem}</p><dl><dt>你的作答</dt><dd>{formatResponse(record.snapshot.selected)}</dd><dt>当时的判断依据</dt><dd>{record.snapshot.explanation}</dd>{fragment && <><dt>所用片段</dt><dd>{fragment.title}</dd></>}{record.decisionReason && <><dt>下一步选择依据</dt><dd>{record.decisionReason}</dd></>}</dl><span className="learning-record__version">{record.contentVersion ?? '版本未知'}{record.attempt ? ` · 第 ${record.attempt} 轮` : ''}</span>{record.contentVersion === TCP_VERSION && <a href="https://www.rfc-editor.org/rfc/rfc5681.html#section-3.1" target="_blank" rel="noreferrer">RFC 5681 §3.1 · 逐 RTT 简化教学模型</a>}</div></details>}
  </article>;
}

interface PointEvidenceState {
  pointId: string;
  state: LearningState;
  assisted: boolean;
}

const STATUS_GROUPS: Array<{ title: string; matches: (item: PointEvidenceState) => boolean }> = [
  { title: '已掌握', matches: (item) => item.state === 'verified' },
  { title: '需要巩固', matches: (item) => item.state === 'needs-reinforcement' },
  { title: '提示后完成', matches: (item) => item.state === 'needs-verification' && item.assisted },
  { title: '待测验', matches: (item) => (item.state === 'needs-verification' && !item.assisted) || item.state === 'learning' },
];

export function ProgressPage() {
  const navigate = usePageNavigate();
  const location = useLocation();
  const returnContext = location.state as { returnTo?: string; returnState?: unknown } | null;
  const returnTo = returnContext?.returnTo && /^\/(universe(?:$|[?#])|library(?:\/|$)|teach\/|practice\/)/.test(returnContext.returnTo) ? returnContext.returnTo : '/library';
  const learnerId = useUserStore((state) => state.activeProfileId);
  const records = useProgressStore((state) => state.evidenceRecords);
  const tasks = useProgressStore((state) => state.remediationTasks);
  const storageError = useProgressStore((state) => state.storageError);
  const learningQuestions = useLearningQuestionStore((state) => state.questions);
  const own = useMemo(() => records.filter((record) => record.learnerId === learnerId && record.eventId && record.snapshot), [records, learnerId]);
  const visible = useMemo(() => own.slice().reverse(), [own]);
  const pointStates = useMemo(() => [...new Set(visible.map((record) => record.nodeId))].map((pointId) => {
    const latest = visible.find((record) => record.nodeId === pointId);
    return {
      pointId,
      state: deriveLearningStateFromEvidence(pointId, learnerId, records),
      assisted: Boolean(latest?.result === 'correct' && (latest.assistance === 'hint' || latest.assistance === 'demonstration' || latest.firstExposure === false)),
    } satisfies PointEvidenceState;
  }), [learnerId, records, visible]);
  const pending = tasks.filter((task) => task.learnerId === learnerId && task.status !== 'done'
    && own.some((record) => record.misconceptionId === task.misconceptionId && task.unitId === `tu-${record.nodeId}`));
  const recommendation = useMemo(() => getLearningRecommendation(learnerId), [learnerId, learningQuestions, records, tasks]);
  const recommendationAction = recommendation
    ? actionForState(deriveLearningStateFromEvidence(recommendation.pointId, learnerId, records))
    : 'study';
  return <div className="page">
    <WorkspaceHeader title="学习记录" backLabel="返回" onBack={() => navigate(returnTo, { state: returnContext?.returnState })} />
    <main className="learning-records">
      <header className="learning-records__intro"><h1>学习记录</h1><p>这里记录你的作答、提示使用和需要巩固的内容。</p></header>
      {storageError && <p className="lesson-save-error" role="alert">{storageError}</p>}
      <section className="evidence-status" aria-labelledby="evidence-status-title"><h2 id="evidence-status-title">当前学习状态</h2><div className="evidence-status__groups">
        {STATUS_GROUPS.map((group) => { const items = pointStates.filter(group.matches); return <section key={group.title}><h3>{group.title}</h3>{items.length ? items.map((item) => <EvidenceStatusRow key={item.pointId} item={item} />) : <p>暂无</p>}</section>; })}
      </div></section>
      <div className="learning-records__body">
        <div className="learning-records__actions">
          <section className="evidence-misconceptions"><h2>当前待解决误区</h2>{pending.length ? pending.slice(0, 5).map((task) => {
            const label = MISCONCEPTIONS_BY_ID.get(task.misconceptionId)?.name ?? TCP_FRAGMENTS[task.misconceptionId.replace('tcp-', '') as keyof typeof TCP_FRAGMENTS]?.label ?? '待巩固的判断';
            const pointId = task.unitId.replace(/^tu-/, '');
            return <article key={task.id}><strong>{label}</strong><p>{task.reason}</p><Link className="text-button" to={actionPath(pointId, 'teach')}>带我学 <ArrowRight size={16} /></Link></article>;
          }) : <p className="progress-empty">当前没有待处理误区。</p>}</section>
          <section className="evidence-next"><h2>下一步</h2>{recommendation ? <><strong>{contentRepository.getNode(recommendation.pointId)?.name ?? recommendation.pointId}</strong><p>{recommendation.reasons.join(' ')}</p><Link className="text-button text-button--primary" to={actionPath(recommendation.pointId, recommendationAction)}>{recommendationAction === 'teach' ? '带我巩固' : recommendationAction === 'verify' ? '再测一次' : '从这里继续'} <ArrowRight size={16} /></Link></> : <p className="progress-empty">当前范围已完成独立验证，可从知识树选择新的方向。</p>}</section>
        </div>
        <section className="recent-evidence" aria-labelledby="recent-evidence-title"><h2 id="recent-evidence-title">最近记录</h2>{visible.length ? visible.slice(0, 80).map((record) => <EvidenceEntry key={record.id} record={record} />) : <div className="learning-records__empty"><p>还没有学习记录。</p><Link className="text-button" to="/library">选择知识点 <ArrowRight size={16} /></Link></div>}{visible.length > 80 && <p className="learning-record__legacy">展示最近 80 条；更早的记录仍保留在本地。</p>}</section>
      </div>
    </main>
  </div>;
}

function EvidenceStatusRow({ item }: { item: PointEvidenceState }) {
  const action = actionForState(item.state);
  const label = action === 'teach' ? '巩固' : action === 'verify' ? '再测一次' : item.state === 'verified' ? '查看' : '继续学习';
  return <Link to={actionPath(item.pointId, action)}><span>{contentRepository.getNode(item.pointId)?.name ?? item.pointId}</span><small>{label}</small><ArrowRight size={14} aria-hidden="true" /></Link>;
}

function actionForState(state: LearningState): 'study' | 'teach' | 'verify' {
  return state === 'needs-reinforcement' ? 'teach' : state === 'verified' || state === 'unknown' || state === 'learning' ? 'study' : 'verify';
}

function actionPath(pointId: string, action: 'study' | 'teach' | 'verify') {
  const node = contentRepository.getNode(pointId);
  if (!node) return ROUTES.library;
  const treeId = BRANCH_TO_TREE_ID[node.branchId];
  return action === 'teach' ? ROUTES.pointTeach('computer', treeId, pointId)
    : action === 'verify' ? ROUTES.pointVerify('computer', treeId, pointId)
      : ROUTES.pointStudy('computer', treeId, pointId);
}
