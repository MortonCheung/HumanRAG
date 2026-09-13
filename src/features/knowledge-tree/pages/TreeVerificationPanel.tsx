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
    [data.testable, evidence, learnerId, remediationTasks],
  );
  const questionCount = new Set(data.testable.flatMap((point) => contentRepository.getQuestionsForNode(point.id).map((question) => question.id))).size;

  return (
    <section className="tree-panel tree-verify-panel">
      <header className="tree-panel__header">
        <p className="tree-panel-kicker">能力验证</p>
        <h1>检验整棵知识树</h1>
        <p>题目按知识点聚合，只覆盖已有题目的节点。</p>
        <button className="tree-verify-panel__start" type="button" disabled={questionCount === 0} onClick={() => {
          if (libraryId && treeId) navigate(ROUTES.treePracticeSession(libraryId, treeId), { state: { origin: { kind: 'tree', libraryId, treeId }, returnTo: location.pathname } });
        }}><Exam size={18} aria-hidden="true" />开始能力验证<span>{questionCount} 道题</span></button>
        <label className="tree-panel-search"><MagnifyingGlass size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索验证范围" placeholder="搜索有题目的知识点" /></label>
      </header>
      <div className="tree-panel__groups">
        {data.groups.map((group) => <PointGroup key={group.id} group={group}
          defaultOpen={group.points.some((point) => point.id === recommendation?.pointId)}
          forceOpen={Boolean(query.trim()) || group.points.some((point) => point.id === selectedPointId)}
        >{(point) => {
            const count = contentRepository.getQuestionsForNode(point.id).length;
            return <li key={point.id}><button type="button" onClick={() => selectPoint(point.id)}>
              <i style={{ background: point.color }} aria-hidden="true" />
              <span><strong>{point.name}</strong><small>{count} 道题</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </button></li>;
          }}</PointGroup>)}
        {data.visible.length === 0 && <p className="tree-panel__empty">{data.testable.length ? '没有匹配的知识点。' : '这棵树还没有可用于验证的题目。'}</p>}
      </div>
    </section>
  );
}
