import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';
import type { PointDraft } from '../../../domain/knowledge/types';
import { PointIntrinsicForm } from '../components/PointIntrinsicForm';
import { createEmptyPointDraft, usePointCreation } from '../PointCreationShell';

export function PointContentPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const { draft, setDraft } = usePointCreation();

  useEffect(() => {
    if (!draft && treeId) {
      setDraft(createEmptyPointDraft(treeId));
    }
  }, [draft, treeId, setDraft]);

  const handleSave = (updated: PointDraft) => {
    setDraft(updated);
    if (libraryId && treeId) {
      navigate(ROUTES.pointNewPlace(libraryId, treeId));
    }
  };

  if (!draft) return null;

  return (
    <div className="point-content-page">
      <h2>编辑知识点</h2>
      <PointIntrinsicForm draft={draft} onSave={handleSave} />
    </div>
  );
}
