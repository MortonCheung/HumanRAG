import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import type { PointDraft } from '../../domain/knowledge/types';

export interface PointCreationContext {
  draft: PointDraft | null;
  setDraft: (draft: PointDraft) => void;
}

export function createEmptyPointDraft(treeId: string): PointDraft {
  return {
    id: '',
    treeId,
    name: '',
    kind: 'knowledge',
    description: '',
    content: '',
    color: '#8b7355',
    tags: [],
    learningObjectives: [],
    misconceptions: [],
    recommendedContent: [],
    childIds: [],
    prerequisiteIds: [],
    relatedIds: [],
  };
}

export function usePointCreation() {
  return useOutletContext<PointCreationContext>();
}

export function PointCreationShell() {
  const [draft, setDraft] = useState<PointDraft | null>(null);

  return (
    <div className="point-creation-shell">
      <div className="point-creation-shell__stage">
        <div className="point-creation-shell__card">
          {draft?.name ? (
            <>
              <span className="point-creation-shell__card-swatch" style={{ background: draft.color }} />
              <strong>{draft.name}</strong>
              {draft.description && <p>{draft.description}</p>}
            </>
          ) : (
            <span>知识卡片预览</span>
          )}
        </div>
      </div>
      <div className="point-creation-shell__form">
        <Outlet context={{ draft, setDraft } satisfies PointCreationContext} />
      </div>
    </div>
  );
}
