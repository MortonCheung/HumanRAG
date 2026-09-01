import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, NotePencil, Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { buildCausalCorridor } from '../graph/causalCorridor';
import { nodesById } from '../data/knowledgeGraph';
import { contentRepository } from '../services/content/ContentRepository';
import { getPathToNode } from '../graph/relevance';
import type { KnowledgeNode } from '../graph/types';
import { colorForBranch } from '../design/domainPalette';
import { useKnowledgeStore } from '../store/knowledgeStore';

const PANEL_EASE = [0.16, 1, 0.3, 1] as const;

/** 同一面板从悬停名称自然生长为点击详情，不切换面板身份。 */
export function NodeInspector() {
  const navigate = useNavigate();
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const hoveredNodeId = useKnowledgeStore((state) => state.hoveredNodeId);
  const explanationByNode = useKnowledgeStore((state) => state.explanationByNode);
  const aiStatusByNode = useKnowledgeStore((state) => state.aiStatusByNode);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(hoveredNodeId);
  const close = useKnowledgeStore((state) => state.closeNodeDetail);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const requestExplanation = useKnowledgeStore((state) => state.requestExplanation);

  useEffect(() => {
    if (selectedNodeId) return undefined;
    if (!hoveredNodeId) {
      setPreviewNodeId(null);
      return undefined;
    }
    const timer = window.setTimeout(() => setPreviewNodeId(hoveredNodeId), 55);
    return () => window.clearTimeout(timer);
  }, [hoveredNodeId, selectedNodeId]);

  const activeId = selectedNodeId ?? previewNodeId;
  const node = activeId ? nodesById.get(activeId) : undefined;
  const expanded = Boolean(selectedNodeId && node);
  const explanation = node ? explanationByNode[node.id] : undefined;
  const aiStatus = node ? (aiStatusByNode[node.id] ?? 'idle') : 'idle';

  const relations = useMemo(() => {
    if (!node || !expanded) return null;
    const corridor = buildCausalCorridor(node.id);
    return {
      path: getPathToNode(node.id),
      upstream: [...corridor.upstreamNodeDepth.keys()].map((id) => nodesById.get(id)).filter(Boolean) as KnowledgeNode[],
      downstream: [...corridor.downstreamNodeDepth.keys()].map((id) => nodesById.get(id)).filter(Boolean) as KnowledgeNode[],
      related: [...corridor.lateralNodeDistance.keys()].map((id) => nodesById.get(id)).filter(Boolean) as KnowledgeNode[],
    };
  }, [expanded, node]);

  return (
    <AnimatePresence initial={false}>
      {node && (
        <motion.aside
          layout
          className={`node-inspector${expanded ? ' is-expanded' : ' node-inspector--peek'}`}
          aria-live="polite"
          aria-label={expanded ? `${node.name}节点详情` : `当前指向 ${node.name}`}
          initial={{ opacity: 0, x: 14, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 10, scale: 0.99 }}
          transition={{ layout: { duration: 0.44, ease: PANEL_EASE }, opacity: { duration: 0.18 }, x: { duration: 0.32, ease: PANEL_EASE } }}
        >
          {expanded && <span className="node-inspector__anchor" aria-hidden="true" />}
          <motion.header layout="position" className="node-inspector__header">
            {!expanded && <span className="node-peek__dot" style={{ background: colorForBranch(node.branchId) }} aria-hidden="true" />}
            <div className="node-inspector__identity">
              <span className="type-kicker">{typeLabel(node.type)}</span>
              <motion.h2 layout="position">{node.name}</motion.h2>
            </div>
            {expanded ? (
              <button className="icon-button" onClick={close} aria-label="关闭节点详情"><X size={17} /></button>
            ) : (
              <span className="node-peek__hint">点击查看</span>
            )}
          </motion.header>

          <AnimatePresence initial={false} mode="popLayout">
            {expanded && relations && (
              <motion.div
                key="node-detail-body"
                className="node-inspector__detail"
                initial={{ opacity: 0, y: 10, clipPath: 'inset(0 0 100% 0)' }}
                animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
                exit={{ opacity: 0, y: 6, clipPath: 'inset(0 0 100% 0)' }}
                transition={{ duration: 0.36, delay: 0.08, ease: PANEL_EASE }}
              >
                <nav className="breadcrumb" aria-label="所属路径">
                  {relations.path.map((item, index) => (
                    <span key={item.id}>
                      <button onClick={() => selectNode(item.id)}>{item.name}</button>
                      {index < relations.path.length - 1 && <b>/</b>}
                    </span>
                  ))}
                </nav>
                <div className="node-inspector__actions">
                  <button
                    className="inspector-primary-action"
                    type="button"
                    onClick={() => {
                      const unit = contentRepository.getTeachingUnitForNode(node.id);
                      navigate(unit ? `/teach/${unit.id}` : '/teach');
                    }}
                  >
                    <BookOpenText size={15} weight="regular" /> 开始学习
                  </button>
                  <button className="inspector-secondary-action" type="button" onClick={() => navigate(`/practice/session/node:${node.id}`)}>
                    <NotePencil size={15} weight="regular" /> 练习这个知识点
                  </button>
                </div>
                <div className="node-inspector__scroll">
                  <section className="inspector-section"><h3>概念</h3><p>{node.description}</p></section>
                  <RelationSection title={`前置知识 ${relations.upstream.length}`} nodes={relations.upstream.slice(0, 6)} onSelect={selectNode} empty="这是当前路径的起点。" />
                  <RelationSection title={`后续知识 ${relations.downstream.length}`} nodes={relations.downstream.slice(0, 6)} onSelect={selectNode} empty="可以从这里延伸到新的技能或练习。" />
                  <RelationSection title="相关知识" nodes={relations.related.slice(0, 4)} onSelect={selectNode} empty="暂无直接关联。" />
                  <section className="inspector-section"><h3>推荐学习内容</h3><ol className="recommend-list">{node.recommendedContent.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol></section>
                  <section className="inspector-section">
                    <div className="inspector-section__heading">
                      <h3>AI 讲解</h3>
                      <button className="text-action" onClick={() => void requestExplanation(node.id)} disabled={aiStatus === 'loading'}><Sparkle size={14} />{aiStatus === 'loading' ? '生成中' : '生成讲解'}</button>
                    </div>
                    <p className={explanation ? '' : 'empty-copy'}>{explanation ?? '根据当前知识关系，解释这个概念在你的学习目标中承担什么作用。'}</p>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function RelationSection({ title, nodes, onSelect, empty }: { title: string; nodes: KnowledgeNode[]; onSelect: (id: string) => void; empty: string }) {
  return <section className="inspector-section"><h3>{title}</h3>{nodes.length ? <div className="relation-list">{nodes.map((item) => <button key={item.id} onClick={() => onSelect(item.id)}><span>{item.name}</span><ArrowRight size={13} /></button>)}</div> : <p className="empty-copy">{empty}</p>}</section>;
}

function typeLabel(type: KnowledgeNode['type']) {
  return { goal: '学习目标', direction: '学习方向', course: '课程', skill: '技能', knowledge: '知识点', practice: '练习' }[type];
}
