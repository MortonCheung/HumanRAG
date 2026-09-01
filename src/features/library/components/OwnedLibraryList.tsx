import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { knowledgeGraph } from '../../../data/knowledgeGraph';
import { SYSTEM_LIBRARY_DEFS } from '../../../data/v6/catalogs/knowledgeBaseCatalog';
import { useLibraryStore } from '../../../store/libraryStore';

export function OwnedLibraryList() {
  const userLibraries = useLibraryStore((state) => state.userLibraries);

  const items = [
    ...SYSTEM_LIBRARY_DEFS.map((def) => {
      const nodeCount = knowledgeGraph.nodes.filter((node) => node.branchId === def.branchId).length;
      const nodeIdSet = new Set(knowledgeGraph.nodes.filter((node) => node.branchId === def.branchId).map((node) => node.id));
      const edgeCount = knowledgeGraph.edges.filter(
        (edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target),
      ).length;
      return { id: def.id, name: def.name, meta: `${nodeCount} 节点 / ${edgeCount} 关系`, isSystem: true };
    }),
    ...userLibraries.map((library) => ({
      id: library.id,
      name: library.name,
      meta: `${library.nodes.length} 节点 / ${library.edges.length} 关系`,
      isSystem: false,
    })),
  ];

  return (
    <section className="panel" style={{ gridColumn: 'span 5' }}>
      <div className="panel__header">
        <div>
          <p className="panel-kicker">我的知识库</p>
          <h3 className="panel-title">全部知识库</h3>
        </div>
      </div>
      <div className="panel__body owned-library-list">
        {items.map((item) => (
          <Link key={item.id} className="owned-library-item" to={`/library/${item.id}`}>
            <span>
              <span className="owned-library-item__name">{item.name}</span>
              <span className="owned-library-item__meta">
                {item.isSystem ? '系统知识库' : '自定义知识库'} · {item.meta}
              </span>
            </span>
            <ArrowRight size={14} style={{ color: 'var(--it-text-faint)' }} />
          </Link>
        ))}
        {userLibraries.length === 0 && (
          <p className="mistake-queue__empty">还没有自定义知识库，点击「创建知识库」开始。</p>
        )}
      </div>
    </section>
  );
}
