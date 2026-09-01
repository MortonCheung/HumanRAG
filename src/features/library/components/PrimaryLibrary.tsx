import { Link } from 'react-router-dom';
import { ArrowRight, Books } from '@phosphor-icons/react';
import { knowledgeGraph } from '../../../data/knowledgeGraph';
import { SYSTEM_LIBRARY_DEFS } from '../../../data/v6/catalogs/knowledgeBaseCatalog';
import { LibraryGraphThumbnail, type ThumbNode, type ThumbEdge } from './LibraryGraphThumbnail';

export function PrimaryLibrary() {
  const primary = SYSTEM_LIBRARY_DEFS[0];
  const nodes = knowledgeGraph.nodes.filter((node) => node.branchId === primary.branchId);
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const edges = knowledgeGraph.edges.filter(
    (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
  );
  const thumbNodes: ThumbNode[] = nodes.map((node) => ({ id: node.id, x: node.basePosition[0], y: node.basePosition[1] }));
  const thumbEdges: ThumbEdge[] = edges.map((edge) => ({ source: edge.source, target: edge.target }));

  return (
    <section className="panel primary-library" style={{ gridColumn: 'span 7' }}>
      <p className="panel-kicker">当前主知识库</p>
      <h2 className="primary-library__name">{primary.name}</h2>
      <span className="primary-library__meta">
        {nodes.length} 节点 / {edges.length} 关系
      </span>
      <p className="primary-library__desc">{primary.description}</p>
      <div className="primary-library__thumb">
        <LibraryGraphThumbnail nodes={thumbNodes} edges={thumbEdges} width={520} height={260} />
      </div>
      <div className="primary-library__actions">
        <Link className="text-button text-button--primary" to={`/library/${primary.id}`}>
          <Books size={15} weight="regular" /> 打开知识库 <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
