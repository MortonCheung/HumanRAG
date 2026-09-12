import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLearningRecommendation } from '../../../ai/learningRecommendation';
import { getPointsForTree, getRegistry, isPointActionable } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { learningStatusFromEvidence, useProgressStore } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { PointGroup } from '../components/PointGroup';
import { filterTreePoints, groupTreePoints } from '../treePointGroups';

export function TreeLearningPathPanel() {
  const { treeId } = useParams<{ treeId: string }>();
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const selectedPointId = useSpatialStageStore((state) => state.selectedTreePointId);
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
  const remediationTasks = useProgressStore((state) => state.remediationTasks);
  const [query, setQuery] = useState('');
  const data = useMemo(() => {
    const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];
    const registry = getRegistry();
    const visible = filterTreePoints(points, query);
    return { points, visible, groups: groupTreePoints(visible, registry.points, registry.relations) };
  }, [query, treeId]);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId, data.points.map((point) => point.id)),
    [data.points, evidence, learnerId, remediationTasks],
  );
  const readyCount = data.points.filter((point) => contentRepository.getTeachingUnitForNode(point.id)).length;

  return (
    <section className="tree-panel tree-path-panel">
      <header className="tree-panel__header">
        <p className="tree-panel-kicker">学习路径</p>
        <h1>沿知识关系前进</h1>
        <p>从课程脉络中选择一个节点，查看它在知识树中的位置与下一步。</p>
        <span>{readyCount} 个节点已有教学内容</span>
        <label className="tree-panel-search"><MagnifyingGlass size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索学习路径" placeholder="搜索知识点" /></label>
      </header>
      <div className="tree-panel__groups">
        {data.groups.map((group) => <PointGroup key={group.id} group={group}
          defaultOpen={group.points.some((point) => point.id === recommendation?.nodeId)}
          forceOpen={Boolean(query.trim()) || group.points.some((point) => point.id === selectedPointId)}
        >{(point) => {
            const available = Boolean(contentRepository.getTeachingUnitForNode(point.id));
            const status = learningStatusFromEvidence(evidence, point.id, learnerId);
            return <li key={point.id}>
              <button type="button" onClick={() => selectPoint(point.id)}>
                <i style={{ background: point.color }} aria-hidden="true" />
                <span><strong>{point.name}</strong><small>{available ? status.label : '教学内容待补充'}</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </li>;
          }}</PointGroup>)}
        {data.visible.length === 0 && <p className="tree-panel__empty">{data.points.length ? '没有匹配的知识点。' : '这棵树还没有可学习的知识点。'}</p>}
      </div>
    </section>
  );
}
