import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ArrowRight } from '@phosphor-icons/react';
import { ROUTES } from '../../../app/routes';
import { migrateV9 } from '../../../domain/knowledge/migration';
import { getPointsForTree } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';

export function TreeQuestionEditorPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const [version] = useState(0);

  const points = useMemo(() => {
    void version;
    if (!treeId) return [];
    migrateV9();
    return getPointsForTree(treeId);
  }, [treeId, version]);

  return (
    <div className="tree-question-editor-page">
      {points.length === 0 && <p className="editor-empty">暂无知识点</p>}
      <ul className="point-list">
        {points.map((point) => (
          <li key={point.id} className="point-list__item">
            <span className="point-list__swatch" style={{ background: point.color }} />
            <div className="point-list__meta">
              <strong>{point.name}</strong>
              <small>{contentRepository.getQuestionsForNode(point.id).length} 道题目</small>
            </div>
            <button
              type="button"
              className="point-list__open"
              disabled={contentRepository.getQuestionsForNode(point.id).length === 0}
              onClick={() => libraryId && treeId && navigate(ROUTES.pointPractice(libraryId, treeId, point.id))}
              aria-label={`打开 ${point.name} 题库`}
            >
              <ArrowRight size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
