import { motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import type { TreeIdentity } from '../../../domain/knowledge/types';
import { normalizeTreeName, generateAnonymousTreeName, createTree } from '../../../domain/knowledge/migration';
import { getTreesForLibrary } from '../../../domain/knowledge/selectors';
import { TreeIdentityForm } from '../components/TreeIdentityForm';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';

export function TreeGenesisPage() {
  const { libraryId } = useParams<{ libraryId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<TreeIdentity>({ name: '', description: '', color: '#8b7355' });
  const [creating, setCreating] = useState(false);

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
    setCreating(true);
    window.setTimeout(() => {
      const tree = createTree(libraryId, { ...identity, name: finalName });
      navigate(ROUTES.treeEdit(libraryId, tree.id, 'structure'));
    }, 720);
  };

  return (
    <div className="creation-screen">
      <WorkspaceHeader breadcrumbs={['知识库', '新建知识树']} onBack={() => navigate(ROUTES.library)} title="新建知识树" />
      <div className="tree-genesis-page">
        <div className="tree-genesis-page__stage">
        <motion.div className={`tree-genesis-page__void${creating ? ' is-creating' : ''}`} style={{ '--tree-color': identity.color || '#8b7355' } as React.CSSProperties} initial={{ opacity: 0, scale: .86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}>
          <i className="tree-genesis-page__orbit tree-genesis-page__orbit--one" />
          <i className="tree-genesis-page__orbit tree-genesis-page__orbit--two" />
          <span className="tree-genesis-page__seed" />
          <div className="tree-genesis-page__preview-copy"><small>预览</small><strong>{identity.name.trim() || '未命名知识树'}</strong><p>{identity.description.trim() || '创建后可继续补充信息和知识点。'}</p></div>
        </motion.div>
        </div>
        <div className="tree-genesis-page__form">
        <p className="page-kicker">知识库</p>
        <h1>新建知识树</h1>
        <p className="tree-genesis-page__lead">填写基本信息。创建后可以随时修改。</p>
        {error && <p className="tree-genesis-page__error">{error}</p>}
          <TreeIdentityForm onSubmit={handleSubmit} onChange={setIdentity} busy={creating} />
        </div>
      </div>
    </div>
  );
}
