import { PencilSimple, Plus } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { deletePoint, hydratePointDraft, migrateV9, savePointDraft, updatePoint } from '../../../domain/knowledge/migration';
import { getPointsForTree, getPrerequisitesForPoint } from '../../../domain/knowledge/selectors';
import type { KnowledgePoint, PointDraft } from '../../../domain/knowledge/types';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';
import { PointInspectorPanel } from '../components/PointInspectorPanel';

export function TreeStructureEditorPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PointDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const graph = useMemo(() => {
    void version;
    if (!treeId) return { points: [], nodes: [], edges: [] };
    const domain = migrateV9();
    const points = getPointsForTree(treeId);
    const pointIds = new Set(points.map((point) => point.id));
    return { points, nodes: toCustomNodes(points), edges: toCustomEdges(domain.relations, pointIds) };
  }, [treeId, version]);

  useEffect(() => {
    if (!editing || !selectedId || !treeId) return;
    const next = hydratePointDraft(treeId, selectedId);
    setDraft(next);
    setError(null);
  }, [editing, selectedId, treeId]);

  if (!libraryId || !treeId) return null;

  const selectedPoint = graph.points.find((point) => point.id === selectedId) ?? null;

  const beginEdit = () => {
    if (!selectedId) return;
    const next = hydratePointDraft(treeId, selectedId);
    if (!next) return;
    setDraft(next);
    setError(null);
    setEditing(true);
  };

  const stopEdit = () => { setEditing(false); setDraft(null); setError(null); };

  const save = () => {
    if (!draft) return;
    const result = savePointDraft(treeId, draft.id, draft);
    if (!result.ok) { setError(result.error); return; }
    stopEdit();
    setVersion((value) => value + 1);
  };

  const handleDelete = (point: KnowledgePoint) => {
    if (!window.confirm(`删除知识点「${point.name}」？它的关系会一并移除。`)) return;
    deletePoint(treeId, point.id);
    if (selectedId === point.id) setSelectedId(null);
    setVersion((value) => value + 1);
    stopEdit();
  };

  const handleMove = (pointId: string, position: [number, number, number]) => {
    updatePoint(pointId, { position });
    if (draft?.id === pointId) setDraft({ ...draft, position });
  };

  return (
    <div className="tree-structure-editor-page">
      <div className="editor-toolbar">
        <div>
          <h2>节点</h2>
          <p>在场景或列表中选择节点，再编辑内容与关系。</p>
        </div>
        <button type="button" className="editor-toolbar__primary" onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))}>
          <Plus size={14} /> 新增知识点
        </button>
      </div>
      {graph.points.length === 0 ? (
        <div className="editor-empty editor-empty--stage">
          <span />
          <strong>暂无知识点</strong>
          <p>新建知识点后，可在此调整位置与关系。</p>
        </div>
      ) : (
        <div className="tree-structure-editor-page__workspace">
          <div className="tree-structure-editor-page__canvas">
            <CustomTreeCanvas nodes={graph.nodes} edges={graph.edges} selectedId={selectedId} onSelect={setSelectedId} onMove={handleMove} />
            <p>拖动节点调整位置 · 拖动画布旋转 · 滚轮缩放</p>
          </div>
          <aside className="tree-editor-panel">
            <header className="tree-editor-panel__header"><span>所有节点</span><button type="button" disabled={!selectedPoint} onClick={editing ? stopEdit : beginEdit}>{editing ? '完成' : <><PencilSimple size={13} /> 编辑</>}</button></header>
            <ul className="point-list tree-structure-editor-page__list">
              {graph.points.map((point) => {
                const prerequisites = getPrerequisitesForPoint(point.id);
                return (
                  <li key={point.id} className={`point-list__item${selectedId === point.id ? ' is-selected' : ''}`}>
                    <button className="point-list__select" type="button" onClick={() => setSelectedId(point.id)}>
                      <span className="point-list__swatch" style={{ background: point.color }} />
                      <span className="point-list__meta"><strong>{point.name}</strong><small>{point.kind}{prerequisites.length > 0 && ` · 前置 ${prerequisites.length}`}</small></span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {editing && draft ? <PointInspectorPanel draft={draft} points={graph.points} onChange={setDraft} onCancel={stopEdit} onSave={save} onDelete={() => selectedPoint && handleDelete(selectedPoint)} error={error} /> : <div className="tree-editor-panel__selection"><small>当前选择</small><strong>{selectedPoint?.name ?? '未选择节点'}</strong><p>{selectedPoint ? '点击“编辑”修改内容、属性和关系。' : '可在左侧场景或上方列表中选择。'}</p></div>}
          </aside>
        </div>
      )}
    </div>
  );
}
