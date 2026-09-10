import { Exam } from '@phosphor-icons/react';
import { useParams, useLocation } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import { getPointsForTree, isPointActionable } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { WorkspaceActions } from '../../workspace/WorkspaceHeader';
import { TreePointDirectory } from '../components/TreePointDirectory';

export function TreePracticePage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const points = treeId ? getPointsForTree(treeId).filter(isPointActionable) : [];
  const hasQuestions = points.some((point) => contentRepository.getQuestionsForNode(point.id).length > 0);
  const initialPointFilterId = (location.state as { pointFilterId?: string } | null)?.pointFilterId;

  return (
    <>
      <WorkspaceActions primary>
      <button
        onClick={() => {
          if (libraryId && treeId) {
            navigate(ROUTES.treePracticeSession(libraryId, treeId), { state: { origin: { kind: 'tree', libraryId, treeId } } });
          }
        }}
        type="button"
        className="context-nav__button context-nav__button--primary"
        disabled={!hasQuestions}
      >
        <Exam size={16} aria-hidden="true" />整树练习
      </button>
      </WorkspaceActions>
      <TreePointDirectory key={treeId} mode="practice" points={points} initialPointFilterId={initialPointFilterId} />
    </>
  );
}
