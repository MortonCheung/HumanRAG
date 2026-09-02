import { ArrowLeft } from '@phosphor-icons/react';
import { motion } from 'motion/react';
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
    <div className="tree-genesis-page">
      <div className="tree-genesis-page__stage">
        <motion.div className={`tree-genesis-page__void${creating ? ' is-creating' : ''}`} style={{ '--tree-color': identity.color || '#8b7355' } as React.CSSProperties} initial={{ opacity: 0, scale: .86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}>
          <i className="tree-genesis-page__orbit tree-genesis-page__orbit--one" />
          <i className="tree-genesis-page__orbit tree-genesis-page__orbit--two" />
          <span className="tree-genesis-page__seed" />
          <div className="tree-genesis-page__preview-copy"><small>新知识树</small><strong>{identity.name.trim() || '未命名知识树'}</strong><p>{identity.description.trim() || '从一个原点开始，之后再添加属于它的知识节点。'}</p></div>
        </motion.div>
        <p className="tree-genesis-page__stage-note">先创造容器，再向其中加入知识。此刻只定义知识树本身。</p>
      </div>
      <div className="tree-genesis-page__form">
        <button type="button" className="creation-back" onClick={() => navigate(ROUTES.library)}><ArrowLeft size={14} /> 返回知识库</button>
        <p className="page-kicker">创建 · 1 / 1</p>
        <h1>创建知识树</h1>
        <p className="tree-genesis-page__lead">像配置一件长期使用的工具一样，先确定它的气质与用途。所有内容都可以稍后补充。</p>
        {error && <p className="tree-genesis-page__error">{error}</p>}
        <TreeIdentityForm onSubmit={handleSubmit} onChange={setIdentity} busy={creating} />
      </div>
    </div>
  );
}
