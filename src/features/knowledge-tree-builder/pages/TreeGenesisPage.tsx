import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import type { TreeIdentity } from '../../../domain/knowledge/types';
import { generateAnonymousTreeName, createTree, migrateV9 } from '../../../domain/knowledge/migration';
import { getTreesForLibrary } from '../../../domain/knowledge/selectors';
import { TreeIdentityForm } from '../components/TreeIdentityForm';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { useUnsavedChanges } from '../../workspace/useUnsavedChanges';
import { useAppBack } from '../../../app/appHistory';
import '../../knowledge-tree-editor/editor-workspace.css';

const emptyIdentity: TreeIdentity = { name: '', description: '', color: '#b1d8ca' };

export function TreeGenesisPage() {
  const { libraryId } = useParams<{ libraryId: string }>();
  const navigate = useNavigate();
  const back = useAppBack({ to: ROUTES.library });
  const reducedMotion = useReducedMotion();
  const [error, setError] = useState<string | null>(null);
  const key = `iteach.tree-draft.v1:${libraryId}`;
  const [identity, setIdentity] = useState<TreeIdentity>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as TreeIdentity | null;
      return value && typeof value.name === 'string' && typeof value.description === 'string' && /^#[\da-f]{6}$/i.test(value.color) ? value : emptyIdentity;
    } catch { return emptyIdentity; }
  });
  const committed = useRef(false);
  const submitting = useRef(false);
  const [creating, setCreating] = useState(false);
  const persist = (next: TreeIdentity | null) => {
    try {
      if (next) sessionStorage.setItem(key, JSON.stringify(next));
      else sessionStorage.removeItem(key);
      setError(null);
      return true;
    } catch { setError('草稿未保存，请勿在创建前刷新页面。'); return false; }
  };
  const { guard } = useUnsavedChanges({
    dirty: !committed.current && JSON.stringify(identity) !== JSON.stringify(emptyIdentity),
    onSave: () => persist(identity),
    onDiscard: () => { committed.current = true; persist(null); },
    allowNavigation: () => committed.current,
  });
  const submit = (next: TreeIdentity) => {
    if (!libraryId || submitting.current) return;
    submitting.current = true;
    setCreating(true);
    try {
      migrateV9();
      const tree = createTree(libraryId, { identity: { ...next, name: next.name.trim() || generateAnonymousTreeName(getTreesForLibrary(libraryId)) } });
      committed.current = true;
      persist(null);
      navigate(ROUTES.treeEdit(libraryId, tree.id, 'structure'), { replace: true });
    } catch (failure) {
      submitting.current = false;
      setCreating(false);
      setError(failure instanceof Error ? failure.message : '未能创建，请重试。');
    }
  };
  return (
    <div className="creation-screen">
      {guard}
      <WorkspaceHeader onBack={back} backLabel="返回知识库" title="新建知识树" primaryAction={<button type="submit" form="tree-identity-form" className="context-nav__button context-nav__button--primary" disabled={creating}>{creating ? '正在创建…' : '创建'}</button>} />
      <div className="tree-genesis-page">
        <div className="tree-genesis-page__stage">
          <motion.div className="tree-genesis-page__void" style={{ '--tree-color': identity.color } as React.CSSProperties} initial={{ opacity: 0, scale: reducedMotion ? 1 : .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reducedMotion ? .1 : .55, ease: [0.22, 1, 0.36, 1] }}>
            <span className="tree-genesis-page__seed" />
            <div className="tree-genesis-page__preview-copy"><strong>{identity.name.trim() || '未命名知识树'}</strong>{identity.description.trim() && <p>{identity.description}</p>}</div>
          </motion.div>
        </div>
        <div className="tree-genesis-page__form">
          {error && <p className="tree-genesis-page__error" role="alert">{error}</p>}
          <TreeIdentityForm identity={identity} onSubmit={submit} onChange={(next) => { setIdentity(next); persist(next); }} busy={creating} />
        </div>
      </div>
    </div>
  );
}
