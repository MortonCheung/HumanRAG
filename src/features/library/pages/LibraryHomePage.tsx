import { useEffect, useMemo, useState } from 'react';
import { Exam, Plus } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { migrateV9 } from '../../../domain/knowledge/migration';
import type { KnowledgeTree } from '../../../domain/knowledge/types';
import { SelectedTreeShowcase } from '../components/SelectedTreeShowcase';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';

export function LibraryHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const domain = useMemo(() => migrateV9(), []);
  const trees = useMemo(
    () => domain.library.treeIds
      .map((id) => [...domain.trees, ...domain.userTrees].find((tree) => tree.id === id))
      .filter((tree): tree is KnowledgeTree => Boolean(tree)),
    [domain],
  );
  const [selectedTreeId, setSelectedTreeId] = useState(() => (location.state as { selectedTreeId?: string } | null)?.selectedTreeId ?? trees[0]?.id ?? null);
  useEffect(() => {
    const fromTree = (location.state as { selectedTreeId?: string } | null)?.selectedTreeId;
    if (fromTree && trees.some((tree) => tree.id === fromTree)) setSelectedTreeId(fromTree);
  }, [location.state, trees]);
  const selectedTree = trees.find((tree) => tree.id === selectedTreeId) ?? null;
  const selectedPointIds = new Set(selectedTree?.pointIds ?? []);
  const selectedPoints = domain.points.filter((point) => selectedPointIds.has(point.id));

  return (
    <main className="page library-manager">
      <WorkspaceHeader
        title="知识库"
        primaryAction={<button type="button" className="context-nav__button context-nav__button--primary" onClick={() => navigate(ROUTES.treeNew(domain.library.id))}><Plus size={16} aria-hidden="true" />创建知识树</button>}
        actions={<>{selectedTree && <button type="button" className="context-nav__button" onClick={() => navigate(ROUTES.tree(domain.library.id, selectedTree.id))}>进入知识树</button>}<button type="button" className="context-nav__button" onClick={() => navigate(ROUTES.libraryPractice(domain.library.id))}><Exam size={16} aria-hidden="true" />综合题库</button></>}
      />
      <div className="library-manager__inner">
        <header className="library-manager__header">
          <div>
            <p className="page-kicker">知识库</p>
            <h1>{domain.library.name}</h1>
          </div>
          <span className="library-manager__count">{trees.length} 棵知识树</span>
        </header>

        <div className="library-manager__workspace">
          <div className="library-manager__preview">
            <SelectedTreeShowcase tree={selectedTree} points={selectedPoints} relations={domain.relations} />
          </div>

          <aside className="library-manager__catalog" aria-label="知识树管理">
            <div className="library-manager__catalog-heading">
              <span>全部知识树</span>
              <small>选择预览</small>
            </div>
            <div className="library-manager__tree-list" role="listbox" aria-label="知识树列表">
              {trees.map((tree) => (
                <button
                  key={tree.id}
                  type="button"
                  role="option"
                  aria-selected={tree.id === selectedTreeId}
                  className={tree.id === selectedTreeId ? 'is-selected' : ''}
                  onClick={() => setSelectedTreeId(tree.id)}
                >
                  <span className="library-manager__tree-swatch" style={{ background: tree.color }} />
                  <span className="library-manager__tree-copy">
                    <strong>{tree.name}</strong>
                    <small>{tree.pointIds.length} 个节点 · {tree.ownerType === 'system' ? '系统' : '个人'}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>

      </div>
    </main>
  );
}
