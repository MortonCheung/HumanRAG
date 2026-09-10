import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import type { PointDraft } from '../../../domain/knowledge/types';
import { PointIntrinsicForm } from '../components/PointIntrinsicForm';
import { usePointCreation } from '../PointCreationShell';
import { WorkspaceActions } from '../../workspace/WorkspaceHeader';

export function PointContentPage() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { draft, setDraft } = usePointCreation();
  const [error, setError] = useState<string | null>(() => (location.state as { notice?: string } | null)?.notice ?? null);

  const handleSave = (updated: PointDraft) => {
    if (!updated.name.trim()) { setError('请填写知识点名称。'); return; }
    setDraft(updated);
    if (libraryId && treeId) {
      navigate(ROUTES.pointNewPlace(libraryId, treeId), { state: { pointDraft: updated } });
    }
  };

  if (!draft) return null;

  return (
    <div className="point-content-page">
      <WorkspaceActions primary><button type="submit" form="point-intrinsic-form" className="context-nav__button context-nav__button--primary">下一步</button></WorkspaceActions>
      {error && <p role="alert" className="point-placement-page__error">{error}</p>}
      <PointIntrinsicForm draft={draft} onChange={(field, value) => setDraft((current) => current ? { ...current, [field]: value } : current)} onSave={handleSave} />
    </div>
  );
}
