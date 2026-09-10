import { Outlet, useLocation, useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { TreeLocalNav } from './TreeLocalNav';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { Plus } from '@phosphor-icons/react';

interface KnowledgeTreeShellProps {
  treeName: string;
  ownerType: 'system' | 'user';
}

export function KnowledgeTreeShell({ treeName, ownerType }: KnowledgeTreeShellProps) {
  const navigate = useNavigate();
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const { pathname } = useLocation();
  const practicing = Boolean(libraryId && treeId && pathname === ROUTES.treePractice(libraryId, treeId));

  const handleEdit = () => {
    if (!libraryId || !treeId) return;
    navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'));
  };

  return (
    <main className="page knowledge-tree-shell">
      <WorkspaceHeader
        title={treeName}
        backLabel="返回知识库"
        onBack={() => navigate(ROUTES.library, { state: { selectedTreeId: treeId } })}
        modes={<TreeLocalNav />}
        primaryAction={ownerType === 'user' && libraryId && treeId ? <button className={`context-nav__button${practicing ? '' : ' context-nav__button--primary'}`} onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))} type="button"><Plus size={16} aria-hidden="true" />新增节点</button> : undefined}
        actions={ownerType === 'user' ? <button className="context-nav__button" onClick={handleEdit} type="button">编辑</button> : <span className="context-nav__read-only" title="系统示例只读。可在知识库创建自己的知识树，新增和编辑节点。">只读示例</span>}
      />
      <div className="knowledge-tree-shell__content">
        <Outlet />
      </div>
    </main>
  );
}
