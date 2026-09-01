import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { checkDuplicateTreeName, migrateV9, updateTree, deleteTree } from '../../../domain/knowledge/migration';
import { getTree, getTreesForLibrary } from '../../../domain/knowledge/selectors';

export function TreeSettingsPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#8b7355');
  const [ownerType, setOwnerType] = useState<'system' | 'user'>('user');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!treeId) return;
    migrateV9();
    const tree = getTree(treeId);
    if (!tree) return;
    setName(tree.name);
    setDescription(tree.description);
    setColor(tree.color);
    setOwnerType(tree.ownerType);
  }, [treeId]);

  if (!libraryId || !treeId) return null;

  const handleSave = () => {
    if (checkDuplicateTreeName(name, getTreesForLibrary(libraryId), treeId)) {
      setError('这个知识库中已经有同名知识树。');
      setSaved(false);
      return;
    }
    updateTree(treeId, { name, description, color });
    setError(null);
    setSaved(true);
  };

  const handleDelete = () => {
    if (!window.confirm(`删除知识树「${name}」？此操作不可恢复。`)) return;
    deleteTree(treeId);
    navigate(ROUTES.libraryHome(libraryId));
  };

  return (
    <div className="tree-settings-page">
      <div className="editor-toolbar">
        <h2>设置</h2>
      </div>
      <div className="settings-form">
        {error && <p className="tree-genesis-page__error">{error}</p>}
        {saved && <p className="settings-form__saved">设置已保存</p>}
        <label className="editor-field">
          名称
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="editor-field">
          简介
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <label className="editor-field">
          颜色
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className="editor-actions">
          <button type="button" className="editor-toolbar__primary" onClick={handleSave}>
            保存设置
          </button>
        </div>
        {ownerType === 'user' && (
          <div className="settings-danger">
            <button type="button" className="settings-danger__button" onClick={handleDelete}>
              删除知识树
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
