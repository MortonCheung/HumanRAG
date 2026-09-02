import { ArrowRight, BookOpenText } from '@phosphor-icons/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { getPointsForTree } from '../../../domain/knowledge/selectors';
import { isPointActionable } from '../../../domain/knowledge/selectors';

export function TreeLearningPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];

  return (
    <section className="tree-scope-page">
      <header><span className="page-kicker">学习内容</span><h2>选择一个知识点</h2><p>每个入口都进入对应知识点的完整教学流程。</p></header>
      <ul className="tree-point-grid">
        {points.map((point) => (
          <li key={point.id}>
            <button
              onClick={() => {
                if (libraryId && treeId) {
                  navigate(ROUTES.pointLearn(libraryId, treeId, point.id), { state: { origin: { kind: 'tree', libraryId, treeId } } });
                }
              }}
              type="button"
            >
              <BookOpenText size={16} />
              <span><strong>{point.name}</strong><small>{point.description}</small></span>
              <ArrowRight size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
