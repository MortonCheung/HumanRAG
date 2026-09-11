import { ROUTES } from '../../app/routes';

interface WorkspaceScope {
  kind: 'learn' | 'practice';
  libraryId?: string;
  treeId?: string;
  pointId?: string;
}

/** Content parent only; entrance origin belongs to view restoration. */
export function getWorkspaceParent({ kind, libraryId, treeId, pointId }: WorkspaceScope): { to: string; state?: { focusedPointId: string } } {
  if (!libraryId || !treeId) return { to: ROUTES.library };
  if (kind === 'learn') return { to: ROUTES.treeLearn(libraryId, treeId) };
  // A return anchor restores orientation; it must never narrow the parent's pool.
  return { to: ROUTES.treePractice(libraryId, treeId), ...(pointId ? { state: { focusedPointId: pointId } } : {}) };
}
