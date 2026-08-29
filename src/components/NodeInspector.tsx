import { ArrowRight, Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { getIncoming, nodesById } from '../data/knowledgeGraph';
import { getPathToNode, getRelatedNodes } from '../graph/relevance';
import type { KnowledgeNode } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';

export function NodeInspector() {
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const node = selectedNodeId ? nodesById.get(selectedNodeId) : undefined;
  return (
    <AnimatePresence>
      {node && <InspectorContent key={node.id} node={node} />}
    </AnimatePresence>
  );
}

function InspectorContent({ node }: { node: KnowledgeNode }) {
  const close = useKnowledgeStore((state) => state.closeNodeDetail);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const requestExplanation = useKnowledgeStore((state) => state.requestExplanation);
  const explanation = useKnowledgeStore((state) => state.explanationByNode[node.id]);
  const aiStatus = useKnowledgeStore((state) => state.aiStatus);
  const path = getPathToNode(node.id);
  const prerequisites = getIncoming(node.id, 'prerequisite').map((edge) => nodesById.get(edge.source)).filter(Boolean) as KnowledgeNode[];
  const related = getRelatedNodes(node.id).filter((item) => item.id !== node.parentId && item.type !== 'practice').slice(0, 5);

  return (
    <motion.aside
      className="node-inspector"
      aria-label={`${node.name}节点详情`}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="node-inspector__anchor" aria-hidden="true" />
      <header className="node-inspector__header">
        <div><span className="type-kicker">{typeLabel(node.type)}</span><h2>{node.name}</h2></div>
        <button className="icon-button" onClick={close} aria-label="关闭节点详情"><X size={17} /></button>
      </header>

      <nav className="breadcrumb" aria-label="所属路径">
        {path.map((item, index) => (
          <span key={item.id}>
            <button onClick={() => selectNode(item.id)}>{item.name}</button>
            {index < path.length - 1 && <b>/</b>}
          </span>
        ))}
      </nav>

      <div className="node-inspector__scroll">
        <InspectorSection title="概念"><p>{node.description}</p></InspectorSection>
        <InspectorSection title="前置知识">
          {prerequisites.length > 0 ? <RelationList nodes={prerequisites} onSelect={selectNode} /> : <p className="empty-copy">可直接从此节点开始。</p>}
        </InspectorSection>
        <InspectorSection title="关联知识">
          {related.length > 0 ? <RelationList nodes={related} onSelect={selectNode} /> : <p className="empty-copy">暂无直接关联节点。</p>}
        </InspectorSection>
        <InspectorSection title="推荐学习内容">
          <ol className="recommend-list">{node.recommendedContent.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>
        </InspectorSection>
        <InspectorSection
          title="AI 学习解释"
          action={<button className="text-action" onClick={() => void requestExplanation(node.id)} disabled={aiStatus === 'loading'}><Sparkle size={14} />{aiStatus === 'loading' ? '生成中' : '生成'}</button>}
        >
          <p className={explanation ? '' : 'empty-copy'}>{explanation ?? '结合你的画像，把这个概念放回当前学习目标中解释。'}</p>
          {explanation && <span className="service-note">本地知识服务</span>}
        </InspectorSection>
      </div>
    </motion.aside>
  );
}

function InspectorSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="inspector-section"><div className="inspector-section__heading"><h3>{title}</h3>{action}</div>{children}</section>;
}

function RelationList({ nodes, onSelect }: { nodes: KnowledgeNode[]; onSelect: (id: string) => void }) {
  return <div className="relation-list">{nodes.map((item) => <button key={item.id} onClick={() => onSelect(item.id)}><span>{item.name}</span><ArrowRight size={13} /></button>)}</div>;
}

function typeLabel(type: KnowledgeNode['type']) {
  return { goal: '目标', direction: '方向', course: '课程', skill: '技能', knowledge: '知识点', practice: '练习' }[type];
}
