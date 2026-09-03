import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { PointDraft } from '../../domain/knowledge/types';
import { ROUTES } from '../../app/routes';
import { WorkspaceHeader } from '../workspace/WorkspaceHeader';

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
  const navigate = useNavigate();
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
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
    <div className="creation-screen">
      <WorkspaceHeader
        breadcrumbs={['知识树', '新建知识点', placing ? '位置与关系' : '内容']}
        title={placing ? '位置与关系' : '新建知识点'}
        onBack={() => {
          if (!libraryId || !treeId) return;
          if (placing) navigate(ROUTES.pointNewContent(libraryId, treeId), { state: { pointDraft: draft } });
          else navigate(ROUTES.treeEdit(libraryId, treeId, 'structure'));
        }}
      />
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
            <span>节点预览</span>
          )}
        </div>
        <p className="point-creation-shell__stage-label">{placing ? '设置位置与关系' : '节点预览'}</p>
        </div>
        <div className="point-creation-shell__form">
          <Outlet context={{ draft, setDraft } satisfies PointCreationContext} />
        </div>
      </div>
    </div>
  );
}
