import { ArrowRight } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getPointsForTree, getRegistry, isPointActionable } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { learningStatusFromEvidence, useProgressStore } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { groupTreePoints } from '../treePointGroups';

export function TreeLearningPathPanel() {
  const { treeId } = useParams<{ treeId: string }>();
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
  const data = useMemo(() => {
    const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];
    const registry = getRegistry();
    return { points, groups: groupTreePoints(points, registry.points, registry.relations) };
  }, [treeId]);
  const readyCount = data.points.filter((point) => contentRepository.getTeachingUnitForNode(point.id)).length;

  return (
    <section className="tree-panel tree-path-panel">
      <header className="tree-panel__header">
        <p className="tree-panel-kicker">学习路径</p>
        <h1>沿知识关系前进</h1>
        <p>从课程脉络中选择一个节点，查看它在知识树中的位置与下一步。</p>
        <span>{readyCount} 个节点已有教学内容</span>
      </header>
      <div className="tree-panel__groups">
        {data.groups.map((group) => <section className="tree-panel__group" key={group.id} aria-label={group.name}>
          <h2>{group.name}<span>{String(group.points.length).padStart(2, '0')}</span></h2>
          <ul>{group.points.map((point) => {
            const available = Boolean(contentRepository.getTeachingUnitForNode(point.id));
            const status = learningStatusFromEvidence(evidence, point.id, learnerId);
            return <li key={point.id}>
              <button type="button" onClick={() => selectPoint(point.id)}>
                <i style={{ background: point.color }} aria-hidden="true" />
                <span><strong>{point.name}</strong><small>{available ? status.label : '教学内容待补充'}</small></span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </li>;
          })}</ul>
        </section>)}
        {data.points.length === 0 && <p className="tree-panel__empty">这棵树还没有可学习的知识点。</p>}
      </div>
    </section>
  );
}
