import { Plus } from '@phosphor-icons/react';
import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../app/pageNavigation';
import { ROUTES } from '../../app/routes';
import { migrateV9 } from '../../domain/knowledge/migration';
import { getPointsForTree, getTree } from '../../domain/knowledge/selectors';
import type { KnowledgePoint } from '../../domain/knowledge/types';
import { useSpatialOccluder } from '../spatial/SpatialViewport';
import { useSpatialStageStore } from '../spatial/spatialStageStore';
import { WorkspaceHeader } from '../workspace/WorkspaceHeader';
import { TreeLocalNav } from './components/TreeLocalNav';
import './knowledge-tree-workspace.css';

export function KnowledgeTreeWorkspace() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stageViewport = useSpatialOccluder('stage');
  const panelViewport = useSpatialOccluder('inspector');
  const selectedPointId = useSpatialStageStore((state) => state.selectedTreePointId);
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const data = useMemo(() => {
    migrateV9();
    const tree = treeId ? getTree(treeId) : undefined;
    return { tree, points: treeId ? getPointsForTree(treeId) : [] };
  }, [treeId]);
  const selectedPoint = data.points.find((point) => point.id === selectedPointId);
  const mode = location.pathname.endsWith('/verify') ? 'verify' : 'path';

  useEffect(() => {
    const focusedPointId = (location.state as { focusedPointId?: string } | null)?.focusedPointId;
    selectPoint(focusedPointId && data.points.some((point) => point.id === focusedPointId) ? focusedPointId : null);
  }, [data.points, location.key, selectPoint]);

  if (!data.tree || !libraryId || !treeId) {
    return <main className="page knowledge-tree-workspace knowledge-tree-workspace--missing"><p>知识树不存在</p></main>;
  }

  return (
    <main className="page knowledge-tree-workspace" data-tree-mode={mode} data-selected-point-id={selectedPoint?.id}>
      <WorkspaceHeader
        title={data.tree.name}
        backLabel="返回知识库"
        onBack={() => navigate(ROUTES.library, { state: { selectedTreeId: treeId }, viewTransition: false })}
        modes={<TreeLocalNav />}
        primaryAction={data.tree.ownerType === 'user' ? <button className="context-nav__button context-nav__button--primary" onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))} type="button"><Plus size={16} aria-hidden="true" />新增节点</button> : undefined}
        actions={data.tree.ownerType === 'user'
          ? <button className="context-nav__button" onClick={() => navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'))} type="button">编辑</button>
          : <span className="context-nav__read-only" title="系统示例只读。可在知识库创建自己的知识树，新增和编辑节点。">只读示例</span>}
      />
      <div className="knowledge-tree-workspace__body">
        <div ref={stageViewport.ref} className="knowledge-tree-workspace__stage" aria-label={`${data.tree.name}三维知识树`}>
          <p>拖动旋转 · 滚轮缩放 · 选择节点</p>
        </div>
        <aside ref={panelViewport.ref} className="knowledge-tree-workspace__panel" aria-label={selectedPoint ? `${selectedPoint.name}详情` : mode === 'path' ? '学习路径' : '能力验证'}>
          {selectedPoint ? <TreePointDetailPanel point={selectedPoint} mode={mode} onClose={() => selectPoint(null)} /> : <Outlet />}
        </aside>
      </div>
    </main>
  );
}

function TreePointDetailPanel({ point, mode, onClose }: { point: KnowledgePoint; mode: 'path' | 'verify'; onClose: () => void }) {
  return (
    <section className="tree-point-detail">
      <button type="button" className="tree-workspace-back" onClick={onClose}>返回{mode === 'path' ? '学习路径' : '能力验证'}</button>
      <p className="tree-panel-kicker">知识点</p>
      <h1>{point.name}</h1>
      <p className="tree-point-detail__description">{point.description || '这个知识点还没有补充说明。'}</p>
      <dl className="tree-point-detail__facts">
        <div><dt>类型</dt><dd>{point.kind === 'course' ? '课程' : point.kind === 'practice' ? '实践' : '知识点'}</dd></div>
        {point.difficulty && <div><dt>难度</dt><dd>{point.difficulty}</dd></div>}
        {point.estimatedMinutes && <div><dt>预计时间</dt><dd>{point.estimatedMinutes} 分钟</dd></div>}
      </dl>
      {point.learningObjectives.length > 0 && <div className="tree-point-detail__section"><h2>学习目标</h2><ul>{point.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></div>}
    </section>
  );
}
