import { ArrowRight, Exam, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getLearningRecommendation } from '../../../ai/learningRecommendation';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { getPointsForTree, getRegistry, isPointActionable } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { useProgressStore } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { PointGroup } from '../components/PointGroup';
import { useLearningQuestionStore } from '../../../domain/learning/learningQuestions';
import { filterTreePoints, groupTreePoints } from '../treePointGroups';

export function TreeVerificationPanel() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const selectedPointId = useSpatialStageStore((state) => state.selectedTreePointId);
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
  const remediationTasks = useProgressStore((state) => state.remediationTasks);
  const learningQuestions = useLearningQuestionStore((state) => state.questions);
  const [query, setQuery] = useState('');
  const data = useMemo(() => {
    const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];
    const registry = getRegistry();
    const testable = points.filter((point) => contentRepository.getQuestionsForNode(point.id).length > 0);
    const visible = filterTreePoints(testable, query);
    return { points, testable, visible, groups: groupTreePoints(visible, registry.points, registry.relations) };
  }, [query, treeId]);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId, data.testable.map((point) => point.id)),
    [data.testable, evidence, learnerId, learningQuestions, remediationTasks],
  );
  const questionCount = new Set(data.testable.flatMap((point) => contentRepository.getQuestionsForNode(point.id).map((question) => question.id))).size;

  return (
    <section className="tree-panel tree-verify-panel">
      <header className="tree-panel__header">
        <h1>测验</h1>
        <button className="tree-verify-panel__start" type="button" disabled={questionCount === 0} onClick={() => {
          if (libraryId && treeId) navigate(ROUTES.treePracticeSession(libraryId, treeId), { state: { origin: { kind: 'tree', libraryId, treeId }, returnTo: location.pathname } });
        }}><Exam size={18} aria-hidden="true" />开始测验</button>
        <label className="tree-panel-search"><MagnifyingGlass size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索知识点" placeholder="搜索知识点" /></label>
      </header>
      <div className="tree-panel__groups">
        {data.groups.map((group) => <PointGroup key={group.id} group={group}
          defaultOpen={group.points.some((point) => point.id === recommendation?.pointId)}
          forceOpen={Boolean(query.trim()) || group.points.some((point) => point.id === selectedPointId)}
        >{(point) => {
            return <li key={point.id}><button type="button" onClick={() => selectPoint(point.id)}>
              <i style={{ background: point.color }} aria-hidden="true" />
              <span><strong>{point.name}</strong><small>有题目</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </button></li>;
          }}</PointGroup>)}
        {data.visible.length === 0 && <p className="tree-panel__empty">{data.testable.length ? '没有匹配的知识点。' : '这棵树还没有可用于验证的题目。'}</p>}
      </div>
    </section>
  );
}
