import { ArrowRight, Exam } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { getPointsForTree, getRegistry, isPointActionable } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { useSpatialStageStore } from '../../spatial/spatialStageStore';
import { groupTreePoints } from '../treePointGroups';

export function TreeVerificationPanel() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const selectPoint = useSpatialStageStore((state) => state.selectTreePoint);
  const data = useMemo(() => {
    const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];
    const registry = getRegistry();
    const testable = points.filter((point) => contentRepository.getQuestionsForNode(point.id).length > 0);
    return { points, testable, groups: groupTreePoints(testable, registry.points, registry.relations) };
  }, [treeId]);
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
      </header>
      <div className="tree-panel__groups">
        {data.groups.map((group) => <section className="tree-panel__group" key={group.id} aria-label={group.name}>
          <h2>{group.name}<span>{String(group.points.length).padStart(2, '0')}</span></h2>
          <ul>{group.points.map((point) => {
            const count = contentRepository.getQuestionsForNode(point.id).length;
            return <li key={point.id}><button type="button" onClick={() => selectPoint(point.id)}>
              <i style={{ background: point.color }} aria-hidden="true" />
              <span><strong>{point.name}</strong><small>{count} 道题</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </button></li>;
          })}</ul>
        </section>)}
        {data.testable.length === 0 && <p className="tree-panel__empty">这棵树还没有可用于验证的题目。</p>}
      </div>
    </section>
  );
}
