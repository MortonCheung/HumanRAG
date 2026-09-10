import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { migrateV9, updateTree, deleteTree } from '../../../domain/knowledge/migration';
import { WorkspaceActions } from '../../workspace/WorkspaceHeader';
import { useUnsavedChanges } from '../../workspace/useUnsavedChanges';
import '../editor-workspace.css';

export function TreeSettingsPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const [tree] = useState(() => { const state = migrateV9(); return [...state.trees, ...state.userTrees].find((candidate) => candidate.id === treeId); });
  const [identity, setIdentity] = useState({ name: tree?.name ?? '', description: tree?.description ?? '', color: tree?.color ?? '#b1d8ca' });
  const [baseline, setBaseline] = useState(identity);
  const [error, setError] = useState<string | null>(null);
  const deleted = useRef(false);
  const dirty = JSON.stringify(identity) !== JSON.stringify(baseline);
  const save = () => {
    if (!treeId) return false;
    const result = updateTree(treeId, identity);
    if (!result.ok) { setError(result.error); return false; }
    setBaseline(identity);
    setError(null);
    return true;
  };
  const { guard, confirmAction } = useUnsavedChanges({ dirty, onSave: save, onDiscard: () => { setIdentity(baseline); setError(null); }, allowNavigation: () => deleted.current });
  const remove = () => {
    if (!treeId || !libraryId || !window.confirm(`删除知识树「${identity.name}」及仅属于它的知识点？此操作不可恢复。`)) return;
    const result = deleteTree(treeId);
    if (!result.ok) { setError(result.error); return; }
    deleted.current = true;
    navigate(ROUTES.libraryHome(libraryId));
  };
  if (!tree) return <p role="alert" className="editor-save-error">未找到这个知识树。</p>;
  return (
    <div className="tree-settings-page">
      {guard}
      <WorkspaceActions primary><button type="button" className="context-nav__button context-nav__button--primary" disabled={!dirty} onClick={save}>保存</button></WorkspaceActions>
      <WorkspaceActions>{dirty && <button type="button" className="context-nav__button" onClick={() => confirmAction(() => undefined)}>放弃修改</button>}</WorkspaceActions>
      <div className="settings-form">
        {error && <p role="alert" className="editor-save-error">{error}</p>}
        <label className="editor-field">名称<input type="text" value={identity.name} onChange={(event) => setIdentity({ ...identity, name: event.target.value })} /></label>
        <label className="editor-field">简介<textarea value={identity.description} onChange={(event) => setIdentity({ ...identity, description: event.target.value })} rows={4} /></label>
        <label className="editor-field">颜色<input type="color" value={identity.color} onChange={(event) => setIdentity({ ...identity, color: event.target.value })} /></label>
        {tree.ownerType === 'user' && <details className="settings-danger"><summary>知识树操作</summary><button type="button" className="settings-danger__button" onClick={remove}>删除知识树</button></details>}
      </div>
    </div>
  );
}
