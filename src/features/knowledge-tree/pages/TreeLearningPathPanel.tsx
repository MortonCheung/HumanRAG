import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLearningRecommendation } from '../../../ai/learningRecommendation';
import { deriveLearningStateFromEvidence, LEARNING_STATE_LABELS } from '../../../domain/learning/deriveLearningState';
import { getPointsForTree, getRegistry, isPointActionable } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { useProgressStore } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { useLearningQuestionStore } from '../../../domain/learning/learningQuestions';
import { PointGroup } from '../components/PointGroup';
import { filterTreePoints, groupTreePoints } from '../treePointGroups';

export function TreeLearningPathPanel() {
  const { treeId } = useParams<{ treeId: string }>();
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
    const visible = filterTreePoints(points, query);
    return { points, visible, groups: groupTreePoints(visible, registry.points, registry.relations) };
  }, [query, treeId]);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId, data.points.map((point) => point.id)),
    [data.points, evidence, learnerId, learningQuestions, remediationTasks],
  );
  const recommendedPoint = data.points.find((point) => point.id === recommendation?.pointId);

  return (
    <section className="tree-panel tree-path-panel">
      <header className="tree-panel__header">
        <h1>知识点</h1>
        {recommendation && recommendedPoint && <button className="tree-recommendation" type="button" onClick={() => selectPoint(recommendation.pointId)}>
          <span>建议先学</span><strong>{recommendedPoint.name}</strong><small>{recommendation.reasons.slice(0, 2).join(' ')}</small><ArrowRight size={17} aria-hidden="true" />
        </button>}
        <label className="tree-panel-search"><MagnifyingGlass size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索知识点" placeholder="搜索知识点" /></label>
      </header>
      <div className="tree-panel__groups">
        {data.groups.map((group) => <PointGroup key={group.id} group={group}
          defaultOpen={group.points.some((point) => point.id === recommendation?.pointId)}
          forceOpen={Boolean(query.trim()) || group.points.some((point) => point.id === selectedPointId)}
        >{(point) => {
            const available = Boolean(contentRepository.getTeachingUnitForNode(point.id));
            const state = deriveLearningStateFromEvidence(point.id, learnerId, evidence);
            return <li key={point.id}>
              <button type="button" onClick={() => selectPoint(point.id)}>
                <i style={{ background: point.color }} aria-hidden="true" />
                <span><strong>{point.name}</strong><small>{available ? LEARNING_STATE_LABELS[state] : '教学内容待补充'}</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </li>;
          }}</PointGroup>)}
        {data.visible.length === 0 && <p className="tree-panel__empty">{data.points.length ? '没有匹配的知识点。' : '这棵树还没有可学习的知识点。'}</p>}
      </div>
    </section>
  );
}
