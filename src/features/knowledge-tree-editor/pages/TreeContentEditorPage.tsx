import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { migrateV9, updatePoint } from '../../../domain/knowledge/migration';
import { getPointsForTree } from '../../../domain/knowledge/selectors';

export function TreeContentEditorPage() {
  const { treeId } = useParams<{ treeId: string }>();
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const points = useMemo(() => {
    void version;
    if (!treeId) return [];
    migrateV9();
    return getPointsForTree(treeId);
  }, [treeId, version]);

  const selected = points.find((p) => p.id === selectedId) ?? null;
  const [draft, setDraft] = useState({ description: '', content: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (id: string) => {
    const point = points.find((p) => p.id === id);
    if (!point) return;
    setSelectedId(id);
    setEditingId(id);
    setDraft({ description: point.description, content: point.content });
  };

  const handleSave = () => {
    if (!editingId) return;
    updatePoint(editingId, { description: draft.description, content: draft.content });
    setVersion((v) => v + 1);
    setEditingId(null);
  };

  return (
    <div className="tree-content-editor-page">
      <div className="editor-toolbar">
        <h2>内容编辑</h2>
      </div>
      {points.length === 0 ? (
        <p className="editor-empty">这棵树还没有知识点。先在结构编辑中添加。</p>
      ) : (
        <div className="content-editor">
          <ul className="content-editor__list">
            {points.map((point) => (
              <li key={point.id}>
                <button
                  type="button"
                  className={`content-editor__item${point.id === editingId ? ' is-active' : ''}`}
                  onClick={() => startEdit(point.id)}
                >
                  {point.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="content-editor__form">
            {selected && editingId ? (
              <>
                <h3>{selected.name}</h3>
                <label className="editor-field">
                  说明
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    rows={3}
                  />
                </label>
                <label className="editor-field">
                  教学正文
                  <textarea
                    value={draft.content}
                    onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    rows={10}
                  />
                </label>
                <div className="editor-actions">
                  <button type="button" onClick={() => setEditingId(null)}>取消</button>
                  <button type="button" className="editor-toolbar__primary" onClick={handleSave}>
                    保存
                  </button>
                </div>
              </>
            ) : (
              <p className="editor-empty">从左侧选择一个知识点开始编辑内容。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
