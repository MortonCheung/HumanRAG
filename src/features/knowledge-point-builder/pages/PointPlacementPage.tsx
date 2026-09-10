import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { createPoint, migrateV9 } from '../../../domain/knowledge/migration';
import { getPointsForTree } from '../../../domain/knowledge/selectors';
import type { CustomEdge, CustomNode } from '../../../store/libraryStore';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';
import { WorkspaceActions } from '../../workspace/WorkspaceHeader';
import { usePointCreation } from '../PointCreationShell';
import '../../knowledge-tree-editor/editor-workspace.css';

export function PointPlacementPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const { draft, setDraft, markCommitted } = usePointCreation();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const committing = useRef(false);
  const graph = useMemo(() => {
    if (!treeId) return { points: [], nodes: [], edges: [] };
    const domain = migrateV9();
    const points = getPointsForTree(treeId);
    return { points, nodes: toCustomNodes(points), edges: toCustomEdges(domain.relations, new Set(points.map((point) => point.id))) };
  }, [treeId]);
  const previewNode = useMemo<CustomNode | null>(() => draft ? {
    id: draft.id, name: draft.name || '新知识点',
    kind: draft.kind === 'course' ? 'course' : draft.kind === 'skill' ? 'topic' : 'knowledge',
    description: draft.description, x: draft.position?.[0] ?? 0, y: draft.position?.[1] ?? -10, z: draft.position?.[2] ?? 0,
    position: draft.position ?? [0, -10, 0], color: draft.color,
  } : null, [draft]);
  const previewEdges = useMemo<CustomEdge[]>(() => !draft ? [] : [
    ...[...new Set([draft.parentId, ...draft.prerequisiteIds].filter((id): id is string => Boolean(id)))].map((source) => ({ id: `preview-pre-${source}-${draft.id}`, source, target: draft.id, relationType: 'prerequisite' as const })),
    ...draft.relatedIds.map((target) => ({ id: `preview-related-${draft.id}-${target}`, source: draft.id, target, relationType: 'related' as const })),
  ], [draft]);

  useEffect(() => {
    if ((!draft || !draft.name.trim()) && libraryId && treeId) navigate(ROUTES.pointNewContent(libraryId, treeId), { replace: true, state: { notice: '请先填写节点内容。' } });
  }, [draft, libraryId, treeId, navigate]);
  if (!draft || !libraryId || !treeId) return null;

  const toggle = (field: 'prerequisiteIds' | 'relatedIds', id: string) => setDraft((current) => !current ? current : { ...current, [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id] });
  const commit = () => {
    if (committing.current) return;
    committing.current = true;
    setSaving(true);
    setError(null);
    try {
      const point = createPoint(treeId, draft);
      markCommitted();
      navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'), { replace: true, state: { selectedPointId: point.id } });
    } catch (failure) {
      committing.current = false;
      setSaving(false);
      setError(failure instanceof Error ? failure.message : '未能创建，请重试。');
    }
  };
  const matches = graph.points.filter((point) => point.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <div className="point-placement-page">
      <WorkspaceActions primary><button type="button" className="context-nav__button context-nav__button--primary" disabled={saving} onClick={commit}>{saving ? '正在保存…' : '创建'}</button></WorkspaceActions>
      <WorkspaceActions><button type="button" className="context-nav__button" onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))}>上一步</button></WorkspaceActions>
      {error && <p role="alert" className="point-placement-page__error">{error}</p>}
      <div className="point-placement-page__tree">
        <CustomTreeCanvas viewKey={`draft:${draft.id}`} nodes={graph.nodes} edges={graph.edges} previewNode={previewNode} previewEdges={previewEdges} selectedId={draft.id} movableIds={[draft.id]} onMove={(id, position) => { if (id === draft.id) setDraft((current) => current ? { ...current, position } : current); }} />
      </div>
      <div className="point-placement-page__fields">
        <label className="editor-field">上级节点<select value={draft.parentId ?? ''} onChange={(event) => setDraft({ ...draft, parentId: event.target.value || undefined })}><option value="">无</option>{graph.points.map((point) => <option key={point.id} value={point.id}>{point.name}</option>)}</select></label>
        <label className="editor-field">查找关系<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <fieldset className="editor-field"><legend>前置知识</legend>{matches.length === 0 ? <small>无匹配节点</small> : matches.map((point) => <label key={point.id} className="editor-check"><input type="checkbox" checked={draft.prerequisiteIds.includes(point.id) || draft.parentId === point.id} disabled={draft.parentId === point.id} onChange={() => toggle('prerequisiteIds', point.id)} />{point.name}</label>)}</fieldset>
        <fieldset className="editor-field"><legend>相关知识</legend>{matches.length === 0 ? <small>无匹配节点</small> : matches.map((point) => <label key={point.id} className="editor-check"><input type="checkbox" checked={draft.relatedIds.includes(point.id)} onChange={() => toggle('relatedIds', point.id)} />{point.name}</label>)}</fieldset>
      </div>
    </div>
  );
}
