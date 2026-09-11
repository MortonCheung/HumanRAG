import { useMemo } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { getPointsForTree, getTree } from '../../../domain/knowledge/selectors';
import { useSpatialOccluder } from '../../spatial/SpatialViewport';

export function TreeOverviewPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const stageViewport = useSpatialOccluder('stage');
  const data = useMemo(() => {
    migrateV9();
    const tree = treeId ? getTree(treeId) : undefined;
    const points = treeId ? getPointsForTree(treeId) : [];
    return { tree, points };
  }, [treeId]);
  const learnableCount = data.points.filter((point) => point.kind === 'knowledge' || point.kind === 'practice').length;

  return (
    <section className="tree-overview-page">
      <div className="tree-overview-page__hero">
        <div ref={stageViewport.ref} className="tree-overview-page__model" aria-label="知识树三维总览" />
        <div className="tree-overview-page__info">
          <span className="page-kicker">知识树</span>
          <h2>选择知识点</h2>
          <p>{data.points.length} 个节点，{learnableCount} 个可学习或练习。</p>
          <button type="button" className="text-button text-button--primary" onClick={() => libraryId && treeId && navigate(ROUTES.treeLearn(libraryId, treeId))}>
            查看知识点 <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
