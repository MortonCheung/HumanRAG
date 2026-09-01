import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import type { TreeIdentity } from '../../../domain/knowledge/types';
import { normalizeTreeName, generateAnonymousTreeName, createTree } from '../../../domain/knowledge/migration';
import { getTreesForLibrary } from '../../../domain/knowledge/selectors';
import { TreeIdentityForm } from '../components/TreeIdentityForm';

export function TreeGenesisPage() {
  const { libraryId } = useParams<{ libraryId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (identity: TreeIdentity) => {
    if (!libraryId) return;

    const trees = getTreesForLibrary(libraryId);
    const normalized = normalizeTreeName(identity.name);

    if (normalized) {
      const exists = trees.some((t) => normalizeTreeName(t.name) === normalized);
      if (exists) {
        setError('这个知识库中已经有同名知识树。');
        return;
      }
    }

    const finalName = identity.name || generateAnonymousTreeName(trees);
    const tree = createTree(libraryId, { ...identity, name: finalName });

    navigate(ROUTES.treeEdit(libraryId, tree.id, 'structure'));
  };

  return (
    <div className="tree-genesis-page">
      <div className="tree-genesis-page__stage">
        <div className="tree-genesis-page__void">
          <span>空无空间</span>
        </div>
      </div>
      <div className="tree-genesis-page__form">
        <h1>创建知识树</h1>
        {error && <p className="tree-genesis-page__error">{error}</p>}
        <TreeIdentityForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
