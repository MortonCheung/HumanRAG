import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { TreeLocalNav } from './TreeLocalNav';

interface KnowledgeTreeShellProps {
  treeName: string;
  ownerType: 'system' | 'user';
}

export function KnowledgeTreeShell({ treeName, ownerType }: KnowledgeTreeShellProps) {
  const navigate = useNavigate();
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();

  const handleEdit = () => {
    if (!libraryId || !treeId) return;
    navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'));
  };

  return (
    <main className="page knowledge-tree-shell">
      <header className="knowledge-tree-shell__header">
        <div className="knowledge-tree-shell__nav-row">
          <button
            className="knowledge-tree-shell__back"
            onClick={() => navigate(ROUTES.library)}
            type="button"
          >
            ← 返回知识库
          </button>
          <strong className="knowledge-tree-shell__bar-title">{treeName}</strong>
          {ownerType === 'user' ? (
            <button className="knowledge-tree-shell__edit" onClick={handleEdit} type="button">编辑</button>
          ) : <span className="knowledge-tree-shell__readonly">系统知识树</span>}
        </div>
        <TreeLocalNav />
      </header>
      <div className="knowledge-tree-shell__content">
        <Outlet />
      </div>
    </main>
  );
}
