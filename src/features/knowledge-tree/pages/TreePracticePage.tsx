import { ArrowRight, Exam } from '@phosphor-icons/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import { getPointsForTree } from '../../../domain/knowledge/selectors';
import { isPointActionable } from '../../../domain/knowledge/selectors';

export function TreePracticePage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];

  return (
    <section className="tree-scope-page">
      <header><span className="page-kicker">题库</span><h2>按知识点练习</h2><p>先明确练习范围，再进入对应微型题库；也可以覆盖整棵知识树。</p></header>
      <button
        onClick={() => {
          if (libraryId && treeId) {
            navigate(ROUTES.treePracticeSession(libraryId, treeId), { state: { origin: { kind: 'tree', libraryId, treeId } } });
          }
        }}
        type="button"
        className="tree-practice-start"
      >
        <Exam size={16} /> 开始整树练习 <ArrowRight size={14} />
      </button>
      <ul className="tree-point-grid">
        {points.map((point) => (
          <li key={point.id}>
            <button
              onClick={() => {
                if (libraryId && treeId) {
                  navigate(ROUTES.pointPractice(libraryId, treeId, point.id), { state: { origin: { kind: 'tree', libraryId, treeId } } });
                }
              }}
              type="button"
            >
              <Exam size={16} />
              <span><strong>{point.name}</strong><small>{point.description}</small></span>
              <ArrowRight size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
