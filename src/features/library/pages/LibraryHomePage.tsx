import { useEffect, useMemo, useState } from 'react';
import { Exam, Plus } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { migrateV9 } from '../../../domain/knowledge/migration';
import type { KnowledgeTree } from '../../../domain/knowledge/types';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { useSpatialOccluder } from '../../spatial/SpatialViewport';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';

export function LibraryHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectStageTree = useSpatialStageStore((state) => state.selectTree);
  const viewport = useSpatialOccluder('inspector');
  const stageViewport = useSpatialOccluder('stage');
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
  useEffect(() => { selectStageTree(selectedTreeId); }, [selectedTreeId, selectStageTree]);
  const selectedTree = trees.find((tree) => tree.id === selectedTreeId) ?? null;

  return (
    <main className="page library-manager">
      <WorkspaceHeader
        title="知识库"
        primaryAction={selectedTree ? <button type="button" className="context-nav__button context-nav__button--primary" onClick={() => navigate(ROUTES.treePath(domain.library.id, selectedTree.id))}>进入知识树</button> : undefined}
        actions={<><button type="button" className="context-nav__button" onClick={() => navigate(ROUTES.treeNew(domain.library.id))}><Plus size={16} aria-hidden="true" />创建知识树</button><button type="button" className="context-nav__button" onClick={() => navigate(ROUTES.libraryPractice(domain.library.id))}><Exam size={16} aria-hidden="true" />测验</button></>}
      />
      <div className="library-manager__inner">
        <header className="library-manager__header">
          <div>
            <p className="page-kicker">知识库</p>
            <h1>{domain.library.name}</h1>
          </div>
        </header>

        <div className="library-manager__workspace">
          <div ref={stageViewport.ref} className="library-manager__preview" aria-label={selectedTree ? `${selectedTree.name}三维预览` : '知识树三维预览'} />

          <aside ref={viewport.ref} className="library-manager__catalog" aria-label="知识树管理">
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
                    {tree.ownerType === 'user' && <small>个人</small>}
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
