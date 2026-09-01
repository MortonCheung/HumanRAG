import { useMemo } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { getPointsForTree, getTree } from '../../../domain/knowledge/selectors';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomEdges, toCustomNodes } from '../../library/treeGraphAdapter';

export function TreeOverviewPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const data = useMemo(() => {
    const domain = migrateV9();
    const tree = treeId ? getTree(treeId) : undefined;
    const points = treeId ? getPointsForTree(treeId) : [];
    const ids = new Set(points.map((point) => point.id));
    return { tree, points, nodes: toCustomNodes(points), edges: toCustomEdges(domain.relations, ids) };
  }, [treeId]);
  const learnableCount = data.points.filter((point) => point.kind === 'knowledge' || point.kind === 'practice').length;

  return (
    <section className="tree-overview-page">
      <div className="tree-overview-page__hero">
        <div className="tree-overview-page__model" aria-label="知识树三维总览">
          <CustomTreeCanvas nodes={data.nodes} edges={data.edges} selectedId={null} interactive={false} autoRotate />
        </div>
        <div className="tree-overview-page__info">
          <span className="page-kicker">使用模式</span>
          <h2>从一个知识点开始</h2>
          <p>{data.points.length} 个节点，其中 {learnableCount} 个可直接学习或练习。知识树在这里用于定位范围，不承担编辑操作。</p>
          <button type="button" className="text-button text-button--primary" onClick={() => libraryId && treeId && navigate(ROUTES.treeLearn(libraryId, treeId))}>
            查看知识点 <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
