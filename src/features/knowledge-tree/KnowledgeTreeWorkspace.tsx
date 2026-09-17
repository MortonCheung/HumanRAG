import { BookOpenText, ChalkboardTeacher, Plus, SealCheck } from '@phosphor-icons/react';
import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../app/pageNavigation';
import { ROUTES } from '../../app/routes';
import { getLearningRecommendation } from '../../ai/learningRecommendation';
import { deriveLearningStateFromEvidence, LEARNING_STATE_LABELS, type LearningState } from '../../domain/learning/deriveLearningState';
import { migrateV9 } from '../../domain/knowledge/migration';
import { getPointsForTree, getTree } from '../../domain/knowledge/selectors';
import type { KnowledgePoint } from '../../domain/knowledge/types';
import { useSpatialOccluder } from '../spatial/SpatialViewport';
import { useSpatialStageStore } from '../spatial/spatialStageStore';
import type { LearningRecommendation } from '../progress/learningRecommendation';
import { useProgressStore } from '../../store/progressStore';
import { useUserStore } from '../../store/userStore';
import { useLearningQuestionStore } from '../../domain/learning/learningQuestions';
import { WorkspaceHeader } from '../workspace/WorkspaceHeader';
import { useAppBack } from '../../app/appHistory';
import './knowledge-tree-workspace.css';

export function KnowledgeTreeWorkspace() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stageViewport = useSpatialOccluder('stage');
  const panelViewport = useSpatialOccluder('inspector');
  const selectedPointId = useSpatialStageStore((state) => state.selectedTreePointId);
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
  const remediationTasks = useProgressStore((state) => state.remediationTasks);
  const learningQuestions = useLearningQuestionStore((state) => state.questions);
  const data = useMemo(() => {
    migrateV9();
    const tree = treeId ? getTree(treeId) : undefined;
    return { tree, points: treeId ? getPointsForTree(treeId) : [] };
  }, [treeId]);
  const selectedPoint = data.points.find((point) => point.id === selectedPointId);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId, data.points.map((point) => point.id)),
    [data.points, evidence, learnerId, learningQuestions, remediationTasks],
  );
  const back = useAppBack({ to: ROUTES.library, state: treeId ? { selectedTreeId: treeId } : undefined });

  useEffect(() => {
    const focusedPointId = (location.state as { focusedPointId?: string } | null)?.focusedPointId;
    selectPoint(focusedPointId && data.points.some((point) => point.id === focusedPointId) ? focusedPointId : null);
  }, [data.points, location.key, selectPoint]);

  if (!data.tree || !libraryId || !treeId) {
    return <main className="page knowledge-tree-workspace knowledge-tree-workspace--missing"><p>知识树不存在</p></main>;
  }

  return (
    <main className="page knowledge-tree-workspace" data-selected-point-id={selectedPoint?.id}>
      <WorkspaceHeader
        title={data.tree.name}
        backLabel="返回知识库"
        onBack={back}
        primaryAction={data.tree.ownerType === 'user' ? <button className="context-nav__button context-nav__button--primary" onClick={() => navigate(ROUTES.pointNewContent(libraryId, treeId))} type="button"><Plus size={16} aria-hidden="true" />新增节点</button> : undefined}
        actions={data.tree.ownerType === 'user'
          ? <button className="context-nav__button" onClick={() => navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'))} type="button">编辑</button>
          : <span className="context-nav__read-only">只读</span>}
      />
      <div className="knowledge-tree-workspace__body">
        <div ref={stageViewport.ref} className="knowledge-tree-workspace__stage" aria-label={`${data.tree.name}三维知识树`} />
        <aside ref={panelViewport.ref} className="knowledge-tree-workspace__panel" aria-label={selectedPoint ? `${selectedPoint.name}详情` : '知识点'}>
          <div className={`knowledge-tree-workspace__mode-panel${selectedPoint ? ' is-obscured' : ''}`} inert={Boolean(selectedPoint)} aria-hidden={Boolean(selectedPoint)}><Outlet /></div>
          {selectedPoint && <TreePointDetailPanel point={selectedPoint} libraryId={libraryId} treeId={treeId} learnerId={learnerId} evidence={evidence} recommendation={recommendation} onClose={() => selectPoint(null)} />}
        </aside>
      </div>
    </main>
  );
}

function TreePointDetailPanel({ point, libraryId, treeId, learnerId, evidence, recommendation, onClose }: {
  point: KnowledgePoint;
  libraryId: string;
  treeId: string;
  learnerId: string;
  evidence: ReturnType<typeof useProgressStore.getState>['evidenceRecords'];
  recommendation: LearningRecommendation | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const learningState = deriveLearningStateFromEvidence(point.id, learnerId, evidence);
  const recommendedAction: 'study' | 'teach' | 'verify' | null = recommendation?.pointId !== point.id
    ? null
    : recommendedActionFor(learningState);
  return (
    <section className="tree-point-detail">
      <button type="button" className="tree-workspace-back" onClick={onClose}>返回知识点</button>
      <p className="tree-panel-kicker">知识点</p>
      <h1>{point.name}</h1>
      {point.description && <p className="tree-point-detail__description">{point.description}</p>}
      <p className={`tree-point-detail__state tree-point-detail__state--${learningState}`}>{LEARNING_STATE_LABELS[learningState]}</p>
      {recommendation?.pointId === point.id && <section className="tree-point-detail__recommendation"><h2>建议</h2><ul>{recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section>}
      <dl className="tree-point-detail__facts">
        <div><dt>类型</dt><dd>{point.kind === 'course' ? '课程' : point.kind === 'practice' ? '实践' : '知识点'}</dd></div>
        {point.difficulty && <div><dt>难度</dt><dd>{point.difficulty}</dd></div>}
        {point.estimatedMinutes && <div><dt>预计时间</dt><dd>{point.estimatedMinutes} 分钟</dd></div>}
      </dl>
      {point.learningObjectives.length > 0 && <div className="tree-point-detail__section"><h2>学习目标</h2><ul>{point.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></div>}
      <div className="point-actions" role="group" aria-label="知识点操作">
        <button type="button" aria-label="自学" className={recommendedAction === 'study' ? 'is-recommended' : ''} onClick={() => navigate(ROUTES.pointStudy(libraryId, treeId, point.id))}><BookOpenText size={18} aria-hidden="true" /><span><strong>自学</strong>{recommendedAction === 'study' && <small>建议</small>}</span></button>
        <button type="button" aria-label="带我学" className={recommendedAction === 'teach' ? 'is-recommended' : ''} onClick={() => navigate(ROUTES.pointTeach(libraryId, treeId, point.id))}><ChalkboardTeacher size={18} aria-hidden="true" /><span><strong>带我学</strong>{recommendedAction === 'teach' && <small>建议</small>}</span></button>
        <button type="button" aria-label="刷题" className={recommendedAction === 'verify' ? 'is-recommended' : ''} onClick={() => navigate(ROUTES.pointVerify(libraryId, treeId, point.id))}><SealCheck size={18} aria-hidden="true" /><span><strong>刷题</strong>{recommendedAction === 'verify' && <small>建议</small>}</span></button>
      </div>
    </section>
  );
}

function recommendedActionFor(state: LearningState): 'study' | 'teach' | 'verify' | null {
  if (state === 'needs-reinforcement') return 'teach';
  if (state === 'needs-verification') return 'verify';
  if (state === 'verified') return null;
  return 'study';
}
