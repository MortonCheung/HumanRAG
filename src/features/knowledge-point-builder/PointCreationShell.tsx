import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import type { PointDraft } from '../../domain/knowledge/types';

export interface PointCreationContext {
  draft: PointDraft | null;
  setDraft: Dispatch<SetStateAction<PointDraft | null>>;
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
  const location = useLocation();
  const [draft, setDraft] = useState<PointDraft | null>(() => {
    const routeState = location.state as { pointDraft?: PointDraft } | null;
    return routeState?.pointDraft ?? null;
  });
  const placing = location.pathname.endsWith('/place');

  useEffect(() => {
    const routeState = location.state as { pointDraft?: PointDraft } | null;
    if (routeState?.pointDraft) setDraft(routeState.pointDraft);
  }, [location.key, location.state]);

  return (
    <div className={`point-creation-shell${placing ? ' is-placement' : ''}`}>
      <div className="point-creation-shell__stage">
        <div className="point-creation-shell__card" style={{ '--point-color': draft?.color ?? '#8b7355' } as React.CSSProperties}>
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
        <p className="point-creation-shell__stage-label">{placing ? '卡片已凝聚为节点' : '知识卡片实时预览'}</p>
      </div>
      <div className="point-creation-shell__form">
        <Outlet context={{ draft, setDraft } satisfies PointCreationContext} />
      </div>
    </div>
  );
}
