import { Plus } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { deletePoint, hydratePointDraft, migrateV9, savePointDraft, updatePoint, V9_STORAGE_KEY } from '../../../domain/knowledge/migration';
import { getPointsForTree } from '../../../domain/knowledge/selectors';
import type { PointDraft } from '../../../domain/knowledge/types';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';
import { WorkspaceActions } from '../../workspace/WorkspaceHeader';
import { useUnsavedChanges } from '../../workspace/useUnsavedChanges';
import { PointInspectorPanel } from '../components/PointInspectorPanel';
import '../editor-workspace.css';

// Position commits and content drafts have different owners.
function contentSignature(draft: PointDraft | null) {
  if (!draft) return '';
  const { position: _position, ...content } = draft;
  return JSON.stringify(content);
}

export function TreeStructureEditorPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialId = (location.state as { selectedPointId?: string } | null)?.selectedPointId ?? null;
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [draft, setDraft] = useState<PointDraft | null>(() => treeId && initialId ? hydratePointDraft(treeId, initialId) : null);
  const [baseline, setBaseline] = useState(() => contentSignature(draft));
  const [pendingPositions, setPendingPositions] = useState<Record<string, [number, number, number]>>({});
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [query, setQuery] = useState('');
  const [mobileView, setMobileView] = useState<'canvas' | 'properties'>('canvas');
  const dirty = contentSignature(draft) !== baseline || Object.keys(pendingPositions).length > 0;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const graph = useMemo(() => {
    void version;
    if (!treeId) return { points: [], nodes: [], edges: [] };
    const domain = migrateV9();
    const points = getPointsForTree(treeId);
    return { points, nodes: toCustomNodes(points), edges: toCustomEdges(domain.relations, new Set(points.map((point) => point.id))) };
  }, [treeId, version]);
  const visibleNodes = useMemo(() => graph.nodes.map((node) => pendingPositions[node.id] ? { ...node, position: pendingPositions[node.id] } : node), [graph.nodes, pendingPositions]);

  const loadPoint = (id: string | null) => {
    const next = treeId && id ? hydratePointDraft(treeId, id) : null;
    setSelectedId(next?.id ?? null);
    setDraft(next);
    setBaseline(contentSignature(next));
    setError(null);
    setConflict(false);
  };
  const discard = () => {
    setPendingPositions({});
    setVersion((value) => value + 1);
    loadPoint(selectedId);
  };
  const save = () => {
    if (!treeId || conflict) return false;
    for (const [id, position] of Object.entries(pendingPositions)) {
      const result = updatePoint(id, { position });
      if (!result.ok) { setError(`位置未保存。${result.error}`); return false; }
      setPendingPositions((current) => { const next = { ...current }; delete next[id]; return next; });
    }
    if (draft && contentSignature(draft) !== baseline) {
      const result = savePointDraft(treeId, draft.id, draft);
      if (!result.ok) { setError(result.error); return false; }
    }
    loadPoint(selectedId);
    setVersion((value) => value + 1);
    return true;
  };
  const { guard, confirmAction } = useUnsavedChanges({ dirty, onSave: save, onDiscard: discard });

  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key !== V9_STORAGE_KEY) return;
      if (dirtyRef.current) {
        setConflict(true);
        setError('另一标签页更新了知识树。本页修改已保留；请放弃本页修改后重新载入。');
      } else {
        setVersion((value) => value + 1);
        const next = treeId && selectedId ? hydratePointDraft(treeId, selectedId) : null;
        setDraft(next);
        setBaseline(contentSignature(next));
      }
    };
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, [selectedId, treeId]);

  const select = (id: string) => {
    if (selectedId === id) return true;
    if (dirty) { confirmAction(() => loadPoint(id)); return false; }
    loadPoint(id);
    return true;
  };
  const move = (id: string, position: [number, number, number]) => {
    const result = updatePoint(id, { position });
    if (!result.ok) {
      setPendingPositions((current) => ({ ...current, [id]: position }));
      setError(`位置未保存。${result.error}`);
      return;
    }
    setPendingPositions((current) => { const next = { ...current }; delete next[id]; return next; });
    setVersion((value) => value + 1);
    setDraft((current) => current?.id === id ? { ...current, position } : current);
    setError(null);
  };
  const remove = () => {
    if (!treeId || !draft || !window.confirm(`删除知识点「${draft.name}」及其关系？`)) return;
    const result = deletePoint(treeId, draft.id);
    if (!result.ok) { setError(result.error); return; }
    setPendingPositions({});
    loadPoint(null);
    setVersion((value) => value + 1);
  };

  if (!libraryId || !treeId) return null;
  const selectedPoint = graph.points.find((point) => point.id === selectedId);
  const filtered = graph.points.filter((point) => point.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <div className="tree-structure-editor-page" data-mobile-view={mobileView}>
      <WorkspaceActions primary>
        <button type="button" className={`context-nav__button${dirty ? '' : ' context-nav__button--primary'}`} onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))}><Plus size={16} aria-hidden="true" />新增节点</button>
        {dirty && <button type="button" className="context-nav__button context-nav__button--primary" disabled={conflict} onClick={save}>保存</button>}
      </WorkspaceActions>
      <WorkspaceActions>
        {dirty && <button type="button" className="context-nav__button" onClick={discard}>放弃修改</button>}
        <button type="button" className="context-nav__button editor-mobile-switch" onClick={() => setMobileView(mobileView === 'canvas' ? 'properties' : 'canvas')}>{mobileView === 'canvas' ? '属性' : '画布'}</button>
      </WorkspaceActions>
      {guard}
      {error && <p role="alert" className="point-inspector__error editor-save-error">{error}</p>}
      <div className="tree-structure-editor-page__workspace">
        <div className="tree-structure-editor-page__canvas">
          {graph.points.length ? <CustomTreeCanvas viewKey={treeId} nodes={visibleNodes} edges={graph.edges} selectedId={selectedId} onSelect={select} onMove={move} /> : <div className="editor-empty editor-empty--stage"><strong>暂无知识点</strong></div>}
        </div>
        <aside className="tree-editor-panel" aria-label="节点属性">
          <label className="editor-node-search"><input type="search" value={query} placeholder="查找节点" aria-label="查找节点" onChange={(event) => setQuery(event.target.value)} /></label>
          <ul className="point-list tree-structure-editor-page__list">
            {filtered.map((point) => <li key={point.id} className={`point-list__item${selectedId === point.id ? ' is-selected' : ''}`}><button className="point-list__select" type="button" aria-pressed={selectedId === point.id} onClick={() => select(point.id)}><span className="point-list__swatch" style={{ background: point.color }} /><span className="point-list__meta"><strong>{point.name}</strong></span></button></li>)}
          </ul>
          {draft && selectedPoint ? <PointInspectorPanel draft={draft} points={graph.points} onChange={setDraft} onDelete={remove} position={pendingPositions[draft.id] ?? selectedPoint.position} onPositionChange={(position) => move(draft.id, position)} /> : <div className="tree-editor-panel__selection"><strong>选择一个节点</strong></div>}
        </aside>
      </div>
    </div>
  );
}
