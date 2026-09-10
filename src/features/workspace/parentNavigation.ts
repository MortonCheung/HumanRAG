import { ROUTES } from '../../app/routes';

interface WorkspaceScope {
  kind: 'learn' | 'practice';
  libraryId?: string;
  treeId?: string;
  pointId?: string;
}

/** Content parent only; entrance origin belongs to view restoration. */
export function getWorkspaceParent({ kind, libraryId, treeId, pointId }: WorkspaceScope): { to: string; state?: { pointFilterId: string } } {
  if (!libraryId || !treeId) return { to: ROUTES.library };
  if (kind === 'learn') return { to: ROUTES.treeLearn(libraryId, treeId) };
  return { to: ROUTES.treePractice(libraryId, treeId), ...(pointId ? { state: { pointFilterId: pointId } } : {}) };
}
