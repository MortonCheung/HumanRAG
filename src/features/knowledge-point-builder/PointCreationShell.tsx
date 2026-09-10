import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../app/pageNavigation';
import { z } from 'zod';
import type { PointDraft } from '../../domain/knowledge/types';
import { ROUTES } from '../../app/routes';
import { WorkspaceHeader } from '../workspace/WorkspaceHeader';
import { useUnsavedChanges } from '../workspace/useUnsavedChanges';

export interface PointCreationContext {
  draft: PointDraft | null;
  setDraft: Dispatch<SetStateAction<PointDraft | null>>;
  error: string | null;
  markCommitted: () => void;
}

const DEFAULT_COLOR = '#b1d8ca';
const pointDraftSchema = z.object({
  id: z.string(), treeId: z.string(), name: z.string(),
  kind: z.enum(['goal', 'direction', 'skill', 'course', 'knowledge', 'practice']),
  description: z.string(), content: z.string(), color: z.string(),
  difficulty: z.enum(['基础', '进阶', '挑战']).optional(),
  estimatedMinutes: z.number().finite().nonnegative().optional(),
  tags: z.array(z.string()), learningObjectives: z.array(z.string()),
  misconceptions: z.array(z.string()), recommendedContent: z.array(z.string()),
  position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
  parentId: z.string().optional(), childIds: z.array(z.string()),
  prerequisiteIds: z.array(z.string()), relatedIds: z.array(z.string()),
});
const draftKey = (treeId: string) => `iteach.point-draft.v1:${treeId}`;

export function createEmptyPointDraft(treeId: string): PointDraft {
  return {
    id: `point-${crypto.randomUUID()}`,
    treeId,
    name: '',
    kind: 'knowledge',
    description: '',
    content: '',
    color: DEFAULT_COLOR,
    tags: [],
    learningObjectives: [],
    misconceptions: [],
    recommendedContent: [],
    childIds: [],
    prerequisiteIds: [],
    relatedIds: [],
  };
}

export function parsePointCreationDraft(value: unknown, treeId: string): PointDraft | null {
  const parsed = pointDraftSchema.safeParse(value);
  if (!parsed.success || parsed.data.treeId !== treeId) return null;
  return { ...parsed.data, id: parsed.data.id || `point-${crypto.randomUUID()}` };
}

function hasDraftChanges(draft: PointDraft | null): boolean {
  return Boolean(draft && (
    draft.name || draft.description || draft.content || draft.color !== DEFAULT_COLOR ||
    draft.position || draft.parentId || draft.difficulty || draft.estimatedMinutes !== undefined ||
    draft.tags.length || draft.learningObjectives.length || draft.misconceptions.length ||
    draft.recommendedContent.length || draft.childIds.length || draft.prerequisiteIds.length || draft.relatedIds.length
  ));
}

function restoreDraft(treeId: string, routeState: unknown): { draft: PointDraft; error: string | null } {
  try {
    const saved = sessionStorage.getItem(draftKey(treeId));
    const value = saved ? JSON.parse(saved) : (routeState as { pointDraft?: unknown } | null)?.pointDraft;
    if (value) {
      const draft = parsePointCreationDraft(value, treeId);
      if (draft) return { draft, error: null };
      return { draft: createEmptyPointDraft(treeId), error: '草稿无法恢复，请重新填写。' };
    }
    return { draft: createEmptyPointDraft(treeId), error: null };
  } catch {
    return { draft: createEmptyPointDraft(treeId), error: '未能读取草稿，请勿在保存前刷新页面。' };
  }
}

export function usePointCreation() {
  return useOutletContext<PointCreationContext>();
}

export function PointCreationShell() {
  const { treeId } = useParams<{ treeId: string }>();
  // A tree owns one draft session. Step changes keep it alive; a different tree
  // starts its own session instead of carrying another tree's in-memory draft.
  return <PointCreationSession key={treeId} />;
}

function PointCreationSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const [restored] = useState(() => treeId ? restoreDraft(treeId, location.state) : { draft: null, error: '未找到所属知识树。' });
  const [draft, setCurrentDraft] = useState<PointDraft | null>(restored.draft);
  const draftRef = useRef(draft);
  const [error, setError] = useState<string | null>(restored.error);
  const committed = useRef(false);
  const placing = location.pathname.endsWith('/place');

  const persist = useCallback((next: PointDraft | null) => {
    if (!treeId) return false;
    try {
      if (next) sessionStorage.setItem(draftKey(treeId), JSON.stringify(next));
      else sessionStorage.removeItem(draftKey(treeId));
      setError(null);
      return true;
    } catch {
      setError('草稿未保存，请勿刷新页面。可继续编辑或重试保存。');
      return false;
    }
  }, [treeId]);

  const setDraft: Dispatch<SetStateAction<PointDraft | null>> = useCallback((update) => {
    const next = typeof update === 'function' ? update(draftRef.current) : update;
    draftRef.current = next;
    setCurrentDraft(next);
    // Save in the originating action, before step navigation can unmount this shell.
    persist(next);
  }, [persist]);

  const markCommitted = () => {
    committed.current = true;
    // Keep the departing page's draft intact until it unmounts. Clearing it here
    // makes the placement guard redirect back to content while navigation loads.
    persist(null);
  };
  const { guard } = useUnsavedChanges({
    dirty: !committed.current && hasDraftChanges(draft),
    onSave: () => persist(draftRef.current),
    onDiscard: markCommitted,
    allowNavigation: (nextPath) => committed.current || Boolean(libraryId && treeId && [ROUTES.pointNewContent(libraryId, treeId), ROUTES.pointNewPlace(libraryId, treeId)].includes(nextPath)),
  });

  return (
    <div className="creation-screen">
      {guard}
      <WorkspaceHeader
        title={placing ? '位置与关系' : '新建知识点'}
        backLabel="返回节点编辑"
        onBack={() => navigate(libraryId && treeId ? ROUTES.treeEdit(libraryId, treeId, 'structure') : ROUTES.library)}
      />
      <div className={`point-creation-shell${placing ? ' is-placement' : ''}`}>
        {!placing && <div className="point-creation-shell__stage">
        <div className="point-creation-shell__card" style={{ '--point-color': draft?.color ?? DEFAULT_COLOR } as React.CSSProperties}>
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
        </div>}
        <div className={`point-creation-shell__form${placing ? ' is-placement' : ''}`}>
          {error && <p className="point-creation-shell__error" role="alert">{error}</p>}
          <Outlet context={{ draft, setDraft, error, markCommitted } satisfies PointCreationContext} />
        </div>
      </div>
    </div>
  );
}
