import { useMemo, useState } from 'react';
import { TransitionLink as Link, usePageNavigate } from '../../../app/pageNavigation';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { useUserStore } from '../../../store/userStore';
import { useProgressStore, learningStatusFromEvidence } from '../../../store/progressStore';
import { contentRepository } from '../../../services/content/ContentRepository';
import { TCP_FRAGMENTS, TCP_REASONS, TCP_VERSION } from '../../../data/v6/handcrafted/tcpLesson';
import { MISCONCEPTIONS_BY_ID } from '../../../data/v6/catalogs/misconceptionCatalog';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import type { EvidenceRecord } from '../../../data/v6/schemas/progressSchema';
import '../progress.css';

const SOURCE = { diagnostic: '尝试', 'guided-practice': '引导练习', 'independent-check': '独立验证', practice: '练习' };
const HELP = { independent: '无提示', hint: '使用提示', demonstration: '示范后完成', unknown: '帮助情况未知' };
function formatResponse(value: string) {
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed.values)) return `${parsed.values.join('、')}；${TCP_REASONS.find((reason) => reason.id === parsed.reason)?.text ?? '未记录理由'}`; } catch { /* Old snapshots may contain plain text. */ }
  return value;
}

function EvidenceEntry({ record }: { record: EvidenceRecord }) {
  const fragment = Object.values(TCP_FRAGMENTS).find((item) => item.id === record.fragmentId);
  return <article className="learning-record">
    <div className="learning-record__heading"><div><strong>{contentRepository.getNode(record.nodeId)?.name ?? record.nodeId}</strong><span>{SOURCE[record.source]} · {record.result === 'correct' ? '正确' : record.result === 'partial' ? '部分正确' : '需巩固'} · {HELP[record.assistance ?? 'unknown']}{record.firstExposure === false ? ' · 已曝光任务' : record.firstExposure === true ? ' · 首次任务' : ''}</span></div><time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></div>
    {record.snapshot ? <details><summary>查看作答与依据</summary><div className="learning-record__snapshot"><p>{record.snapshot.stem}</p><dl><dt>你的作答</dt><dd>{formatResponse(record.snapshot.selected)}</dd><dt>当时的判断依据</dt><dd>{record.snapshot.explanation}</dd>{fragment && <><dt>所用片段</dt><dd>{fragment.title}</dd></>}{record.decisionReason && <><dt>下一步选择依据</dt><dd>{record.decisionReason}</dd></>}</dl><span className="learning-record__version">{record.contentVersion ?? '版本未知'}{record.attempt ? ` · 第 ${record.attempt} 轮` : ''}</span>{record.contentVersion === TCP_VERSION && <a href="https://www.rfc-editor.org/rfc/rfc5681.html#section-3.1" target="_blank" rel="noreferrer">RFC 5681 §3.1 · 逐 RTT 简化教学模型</a>}</div></details> : <p className="learning-record__legacy">旧记录缺少内容版本、帮助与曝光信息，不计为独立验证通过。</p>}
  </article>;
}

export function ProgressPage() {
  const navigate = usePageNavigate();
  const location = useLocation();
  const returnContext = location.state as { returnTo?: string; returnState?: unknown } | null;
  const returnTo = returnContext?.returnTo && /^\/(universe(?:$|[?#])|library(?:\/|$)|teach\/|practice\/)/.test(returnContext.returnTo) ? returnContext.returnTo : '/library';
  const learnerId = useUserStore((state) => state.activeProfileId);
  const records = useProgressStore((state) => state.evidenceRecords);
  const tasks = useProgressStore((state) => state.remediationTasks);
  const storageError = useProgressStore((state) => state.storageError);
  const [showLegacy, setShowLegacy] = useState(false);
  const own = useMemo(() => records.filter((record) => record.learnerId === learnerId), [records, learnerId]);
  const live = own.filter((record) => record.eventId && record.snapshot);
  const visible = (showLegacy ? own : live).slice().reverse();
  const nodeIds = [...new Set(live.slice().reverse().map((record) => record.nodeId))];
  const pending = tasks.filter((task) => task.learnerId === learnerId && task.status !== 'done' && live.some((record) => record.misconceptionId === task.misconceptionId));
  return <div className="page">
    <WorkspaceHeader title="学习记录" backLabel="返回" onBack={() => navigate(returnTo, { state: returnContext?.returnState })} actions={<label className="record-source-filter"><input type="checkbox" checked={showLegacy} onChange={(event) => setShowLegacy(event.target.checked)} />包含旧记录与演示数据</label>} />
    <main className="learning-records"><header className="learning-records__intro"><h1>学习记录</h1><span>{live.length} 条实际作答 · {nodeIds.length} 个知识点</span></header>
      {storageError && <p className="lesson-save-error" role="alert">{storageError}</p>}
      <div className="learning-records__body"><section aria-label="作答记录"><h2>最近作答</h2>{visible.length ? visible.slice(0, 80).map((record) => <EvidenceEntry key={record.id} record={record} />) : <div className="learning-records__empty"><p>还没有实际作答。</p><Link className="text-button" to="/library">选择知识点 <ArrowRight size={16} /></Link></div>}{visible.length > 80 && <p className="learning-record__legacy">展示最近 80 条；更早的记录仍保留在本地。</p>}</section>
        <aside className="learning-records__next"><h2>当前状态</h2>{nodeIds.length ? nodeIds.map((nodeId) => { const status = learningStatusFromEvidence(records, nodeId, learnerId); return <div className="record-node-status" key={nodeId}><strong>{contentRepository.getNode(nodeId)?.name ?? nodeId}</strong><span className={`record-node-status--${status.status}`}>{status.label}</span><small>{status.updatedAt ? new Date(status.updatedAt).toLocaleDateString('zh-CN') : ''}</small></div>; }) : <p className="progress-empty">尚未验证</p>}
          {pending.length > 0 && <section className="record-next-steps"><h2>接下来</h2>{pending.slice(0, 5).map((task) => { const unit = contentRepository.getTeachingUnit(task.unitId); const label = MISCONCEPTIONS_BY_ID.get(task.misconceptionId)?.name ?? TCP_FRAGMENTS[task.misconceptionId.replace('tcp-', '') as keyof typeof TCP_FRAGMENTS]?.label; return <div key={task.id}><strong>{label ?? '待巩固的步骤'}</strong><p>{task.reason}</p>{unit && <Link className="text-button" to={`/teach/${unit.id}`}>继续学习 <ArrowRight size={16} /></Link>}</div>; })}</section>}
        </aside>
      </div>
    </main>
  </div>;
}
