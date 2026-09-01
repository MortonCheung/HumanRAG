import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { deletePoint, migrateV9, updatePoint } from '../../../domain/knowledge/migration';
import { getPointsForTree, getPrerequisitesForPoint } from '../../../domain/knowledge/selectors';
import type { KnowledgePoint } from '../../../domain/knowledge/types';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';

export function TreeStructureEditorPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const graph = useMemo(() => {
    void version;
    if (!treeId) return { points: [], nodes: [], edges: [] };
    const domain = migrateV9();
    const points = getPointsForTree(treeId);
    const pointIds = new Set(points.map((point) => point.id));
    return { points, nodes: toCustomNodes(points), edges: toCustomEdges(domain.relations, pointIds) };
  }, [treeId, version]);

  if (!libraryId || !treeId) return null;

  const handleDelete = (point: KnowledgePoint) => {
    if (!window.confirm(`删除知识点「${point.name}」？它的关系会一并移除。`)) return;
    deletePoint(treeId, point.id);
    if (selectedId === point.id) setSelectedId(null);
    setVersion((value) => value + 1);
  };

  const handleMove = (pointId: string, position: [number, number, number]) => {
    updatePoint(pointId, { position });
  };

  return (
    <div className="tree-structure-editor-page">
      <div className="editor-toolbar">
        <div>
          <h2>结构编辑</h2>
          <p>在三维空间中整理节点。这里仅处理位置与结构，不编辑教学正文。</p>
        </div>
        <button type="button" className="editor-toolbar__primary" onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))}>
          新增知识点
        </button>
      </div>
      {graph.points.length === 0 ? (
        <div className="editor-empty editor-empty--stage">
          <span />
          <strong>这棵知识树还没有节点</strong>
          <p>先创建第一个知识点，空间结构会从这里自然生长。</p>
        </div>
      ) : (
        <div className="tree-structure-editor-page__workspace">
          <div className="tree-structure-editor-page__canvas">
            <CustomTreeCanvas nodes={graph.nodes} edges={graph.edges} selectedId={selectedId} onSelect={setSelectedId} onMove={handleMove} />
            <p>拖动节点调整位置 · 拖动画布旋转 · 滚轮缩放</p>
          </div>
          <ul className="point-list tree-structure-editor-page__list">
            {graph.points.map((point) => {
              const prerequisites = getPrerequisitesForPoint(point.id);
              return (
                <li key={point.id} className={`point-list__item${selectedId === point.id ? ' is-selected' : ''}`}>
                  <button className="point-list__select" type="button" onClick={() => setSelectedId(point.id)}>
                    <span className="point-list__swatch" style={{ background: point.color }} />
                    <span className="point-list__meta">
                      <strong>{point.name}</strong>
                      <small>{point.kind}{prerequisites.length > 0 && ` · 前置 ${prerequisites.length} 项`}</small>
                    </span>
                  </button>
                  <button type="button" className="point-list__danger" onClick={() => handleDelete(point)}>删除</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
