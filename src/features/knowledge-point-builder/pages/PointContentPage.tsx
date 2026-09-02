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
      navigate(ROUTES.pointNewPlace(libraryId, treeId), { state: { pointDraft: updated } });
    }
  };

  if (!draft) return null;

  return (
    <div className="point-content-page">
      <h2>编辑知识点</h2>
      <p className="point-content-page__lead">先完成知识卡片本身；名称和正文都可留空，系统会创建一个可继续编辑的占位节点。</p>
      <PointIntrinsicForm draft={draft} onChange={(field, value) => setDraft((current) => current ? { ...current, [field]: value } : current)} onSave={handleSave} onCancel={() => libraryId && treeId && navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'))} />
    </div>
  );
}
