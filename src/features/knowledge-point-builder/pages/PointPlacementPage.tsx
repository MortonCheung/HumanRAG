import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { createPoint, migrateV9 } from '../../../domain/knowledge/migration';
import { getPointsForTree } from '../../../domain/knowledge/selectors';
import type { CustomEdge, CustomNode } from '../../../store/libraryStore';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomNodes } from '../../library/treeGraphAdapter';
import { usePointCreation } from '../PointCreationShell';

export function PointPlacementPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const { draft, setDraft } = usePointCreation();

  const candidates = useMemo(() => {
    if (!treeId) return [];
    migrateV9();
    return getPointsForTree(treeId);
  }, [treeId]);
  const previewNodes = useMemo(() => toCustomNodes(candidates), [candidates]);
  const previewNode = useMemo<CustomNode | null>(() => draft ? {
    id: 'point-preview',
    name: draft.name || '新知识点',
    kind: draft.kind === 'course' ? 'course' : draft.kind === 'skill' ? 'topic' : 'knowledge',
    description: draft.description,
    x: draft.position?.[0] ?? 0,
    y: draft.position?.[1] ?? -10,
    z: draft.position?.[2] ?? 0,
    position: draft.position ?? [0, -10, 0],
    color: draft.color,
  } : null, [draft]);
  const previewEdges = useMemo<CustomEdge[]>(() => draft?.parentId ? [{
    id: 'point-preview-parent',
    source: draft.parentId,
    target: 'point-preview',
    relationType: 'hierarchy',
  }] : [], [draft?.parentId]);

  useEffect(() => {
    if (!draft && libraryId && treeId) navigate(ROUTES.pointNewContent(libraryId, treeId), { replace: true });
  }, [draft, libraryId, treeId, navigate]);

  if (!draft) return null;

  const toggleMulti = (field: 'prerequisiteIds' | 'relatedIds', id: string) => {
    const current = draft[field];
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    setDraft({ ...draft, [field]: next });
  };

  const handleCommit = () => {
    if (!libraryId || !treeId) return;
    const baseName = `未命名知识点 ${candidates.length + 1}`;
    const finalDraft = { ...draft, name: draft.name.trim() || baseName };
    setDraft(finalDraft);
    createPoint(treeId, finalDraft);
    navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'));
  };

  return (
    <div className="point-placement-page">
      <h2>位置与关系</h2>
      <p className="point-placement-page__lead">设置节点位置及其与已有节点的关系。</p>
      <div className="point-placement-page__tree">
        <CustomTreeCanvas
          nodes={previewNodes}
          edges={[]}
          previewNode={previewNode}
          previewEdges={previewEdges}
          selectedId="point-preview"
          onMove={(id, position) => {
            if (id === 'point-preview') setDraft({ ...draft, position });
          }}
        />
        <small>拖动节点设置位置</small>
      </div>
      <div className="point-placement-page__fields">
        <label className="editor-field">
          父节点
          <select value={draft.parentId ?? ''} onChange={(event) => setDraft({ ...draft, parentId: event.target.value || undefined })}>
            <option value="">无</option>
            {candidates.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}
          </select>
        </label>
        <fieldset className="editor-field">
          <legend>前置知识</legend>
          {candidates.length === 0 ? <small>这棵树还没有其他知识点</small> : candidates.map((point) => (
            <label key={point.id} className="editor-check">
              <input type="checkbox" checked={draft.prerequisiteIds.includes(point.id)} onChange={() => toggleMulti('prerequisiteIds', point.id)} />
              {point.name}
            </label>
          ))}
        </fieldset>
        <fieldset className="editor-field">
          <legend>相关知识</legend>
          {candidates.length === 0 ? <small>这棵树还没有其他知识点</small> : candidates.map((point) => (
            <label key={point.id} className="editor-check">
              <input type="checkbox" checked={draft.relatedIds.includes(point.id)} onChange={() => toggleMulti('relatedIds', point.id)} />
              {point.name}
            </label>
          ))}
        </fieldset>
      </div>
      <button type="button" className="point-placement-page__commit" onClick={handleCommit}>加入知识树</button>
    </div>
  );
}
