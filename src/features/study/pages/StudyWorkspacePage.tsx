import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { TransitionLink as Link, usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { TCP_NODE_ID, TCP_RULES, TCP_VERSION } from '../../../data/v6/handcrafted/tcpLesson';
import { getPoint, getPrerequisitesForPoint, getRelatedForPoint } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { useUserStore } from '../../../store/userStore';
import { ContentBlockView } from '../../teaching/components/ContentBlockView';
import { TcpDemonstration } from '../../teaching/components/TcpLesson';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { getWorkspaceParent } from '../../workspace/parentNavigation';
import '../../teaching/teaching.css';
import '../../teaching/tcp-lesson.css';
import '../study.css';

function ConceptWorkbench({ concepts, objective }: { concepts: string[]; objective: string }) {
  const [index, setIndex] = useState(0);
  const active = concepts[index];
  return <section className="concept-workbench" aria-labelledby="concept-workbench-title">
    <div className="concept-workbench__heading"><div><p className="study-section__kicker">可操作观察台</p><h2 id="concept-workbench-title">沿概念链逐步检查</h2></div><span>{index + 1} / {concepts.length}</span></div>
    <input type="range" min="0" max={Math.max(concepts.length - 1, 0)} value={index} onChange={(event) => setIndex(Number(event.target.value))} aria-label="拖动查看核心概念" />
    <div className="concept-workbench__stage"><small>当前概念</small><strong>{active}</strong><p>{objective}</p></div>
    <div className="concept-workbench__actions"><button type="button" className="text-button text-button--ghost" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}><CaretLeft size={15} />上一个</button><button type="button" className="text-button text-button--ghost" disabled={index === concepts.length - 1} onClick={() => setIndex((value) => Math.min(concepts.length - 1, value + 1))}>下一个<CaretRight size={15} /></button></div>
  </section>;
}

export function StudyWorkspacePage() {
  const { libraryId, treeId, pointId } = useParams<{ libraryId: string; treeId: string; pointId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const learnerId = useUserStore((state) => state.activeProfileId);
  const [scratchpad, setScratchpad] = useState('');
  const point = pointId ? getPoint(pointId) : undefined;
  const node = pointId ? contentRepository.getNode(pointId) : undefined;
  const unit = pointId ? contentRepository.getTeachingUnitForNode(pointId) : undefined;
  const prerequisites = useMemo(() => pointId ? getPrerequisitesForPoint(pointId) : [], [pointId]);
  const related = useMemo(() => pointId ? getRelatedForPoint(pointId) : [], [pointId]);
  const steps = unit?.stepIds.map((id) => contentRepository.getTeachingStep(id)).filter((step) => step !== undefined) ?? [];
  const explanationBlocks = steps.filter((step) => step.kind === 'explanation').flatMap((step) => step.bodyBlocks);
  const exampleBlocks = steps.filter((step) => step.kind === 'worked-example').flatMap((step) => step.bodyBlocks).filter((block) => block.kind === 'example');
  const objective = point?.learningObjectives[0] ?? unit?.objective ?? point?.description ?? node?.description ?? '建立这个知识点的核心概念与适用边界。';
  const concepts = Array.from(new Set([...(point?.recommendedContent ?? []), ...(point?.tags ?? [])])).slice(0, 5);
  const usefulConcepts = concepts.length > 0 ? concepts : [`${point?.name ?? node?.name ?? '本知识点'}的核心概念`, '适用条件', '常见边界'];
  const sourceLabels = Array.from(new Set((pointId ? contentRepository.getQuestionsForNode(pointId) : []).map((question) => question.sourceLabel))).slice(0, 3);
  const parent = getWorkspaceParent({ kind: 'learn', libraryId, treeId, pointId });
  const exit = () => navigate(parent.to, { state: parent.state });

  return <div className="page study-page">
    <WorkspaceHeader title={point?.name ?? node?.name ?? '自主学习'} backLabel="返回知识树" onBack={exit} actions={<Link className="context-nav__button" to={ROUTES.progress} state={{ returnTo: location.pathname, returnState: location.state }}>学习证据</Link>} primaryAction={libraryId && treeId && pointId ? <Link className="context-nav__button context-nav__button--primary" to={ROUTES.pointTeach(libraryId, treeId, pointId)}>带我学</Link> : undefined} />
    {!point || !libraryId || !treeId || !pointId ? <main className="page__inner"><h1 className="page-title">没有找到这个知识点</h1><p className="page-lead">它可能已被移除，或不属于当前知识树。</p></main> : <div className="study-workspace">
      <main className="study-workspace__main">
        <header className="study-hero"><p className="study-section__kicker">自主学习 · {point.estimatedMinutes ?? unit?.estimatedMinutes ?? 12} 分钟</p><h1>{point.name}</h1><p>{point.description || node?.description}</p><div className="study-core-question"><span>核心问题</span><strong>{point.id === TCP_NODE_ID ? '为什么发送方不能无限增加发送速率？' : objective}</strong></div></header>

        <section className="study-section" aria-labelledby="study-prerequisites"><p className="study-section__kicker">开始之前</p><h2 id="study-prerequisites">先确认这些前置</h2>{prerequisites.length ? <ul className="study-inline-list">{prerequisites.map((entry) => <li key={entry.id}>{entry.name}</li>)}</ul> : <p className="study-section__lead">无需额外前置，可以直接从核心问题开始。</p>}</section>

        <section className="study-section" aria-labelledby="study-concepts"><p className="study-section__kicker">核心概念</p><h2 id="study-concepts">围绕问题建立结构</h2><div className="study-content-blocks">{explanationBlocks.length ? explanationBlocks.map((block, index) => <ContentBlockView key={`explain-${index}`} block={block} />) : <><p>{point.content || objective}</p><ul className="summary-list">{usefulConcepts.map((concept) => <li key={concept}>{concept}</li>)}</ul></>}</div></section>

        <section className="study-section" aria-labelledby="study-demo"><p className="study-section__kicker">运行与观察</p><h2 id="study-demo">改变条件，再看过程</h2>{point.id === TCP_NODE_ID ? <><p className="study-section__lead">先写下预测，再运行窗口变化；揭示过的结果会被记录，后续独立验证只使用新条件。</p><TcpDemonstration difficulty="unknown" learnerId={learnerId} /></> : <ConceptWorkbench concepts={usefulConcepts} objective={objective} />}</section>

        <section className="study-section" aria-labelledby="study-examples"><p className="study-section__kicker">典型示例</p><h2 id="study-examples">看一次完整推演</h2><div className="study-content-blocks">{exampleBlocks.length ? exampleBlocks.map((block, index) => <ContentBlockView key={`example-${index}`} block={block} />) : <div className="worked-example"><h4 className="worked-example__title">从条件到结论</h4><p className="worked-example__prompt">用「{point.name}」解释一个具体情境。</p><ol className="worked-example__steps"><li>写出已知条件与目标。</li><li>选择适用的核心概念，并说明理由。</li><li>检查结论是否超出适用边界。</li></ol></div>}</div></section>

        <section className="study-section study-try" aria-labelledby="study-try"><p className="study-section__kicker">自己试试</p><h2 id="study-try">先用自己的话解释</h2><label htmlFor="study-scratchpad">回答核心问题，并写下一个仍不确定的地方。</label><textarea id="study-scratchpad" value={scratchpad} onChange={(event) => setScratchpad(event.target.value)} placeholder="这里是临时推演区，不计入掌握证据。" /><div className="study-try__actions"><Link className="text-button text-button--primary" to={ROUTES.pointVerify(libraryId, treeId, pointId)}>用新题验证 <ArrowRight size={16} /></Link><Link className="text-button text-button--ghost" to={ROUTES.pointTeach(libraryId, treeId, pointId)}>需要引导</Link></div></section>

        <section className="study-section" aria-labelledby="study-sources"><p className="study-section__kicker">延伸与来源</p><h2 id="study-sources">继续查证</h2>{point.id === TCP_NODE_ID && <div className="study-source"><strong>RFC 5681 · §3.1</strong><p>{TCP_RULES} 本页使用逐 RTT 离散模型，内容版本 {TCP_VERSION}。</p><a href="https://www.rfc-editor.org/rfc/rfc5681.html#section-3.1" target="_blank" rel="noreferrer">打开原始规范</a></div>}<ul className="study-resource-list">{Array.from(new Set([...point.recommendedContent, ...sourceLabels])).map((source) => <li key={source}>{source}</li>)}</ul></section>
      </main>

      <aside className="study-context" aria-label="知识点上下文"><section><p className="study-section__kicker">当前位置</p><strong>{point.name}</strong><span>{point.difficulty ?? '基础'} · {point.estimatedMinutes ?? unit?.estimatedMinutes ?? 12} 分钟</span></section><section><p className="study-section__kicker">前置知识</p>{prerequisites.length ? prerequisites.map((entry) => <Link key={entry.id} to={ROUTES.pointStudy(libraryId, treeId, entry.id)}>{entry.name}<ArrowRight size={14} /></Link>) : <span>没有额外前置</span>}</section><section><p className="study-section__kicker">相关知识</p>{related.length ? related.map((entry) => <Link key={entry.id} to={ROUTES.pointStudy(libraryId, treeId, entry.id)}>{entry.name}<ArrowRight size={14} /></Link>) : <span>暂无关联知识点</span>}</section></aside>
    </div>}
  </div>;
}
