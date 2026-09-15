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
  if (kind === 'learn') return { to: ROUTES.treePath(libraryId, treeId), ...(pointId ? { state: { focusedPointId: pointId } } : {}) };
  // A return anchor restores orientation in the single knowledge-point view.
  return { to: ROUTES.treePath(libraryId, treeId), ...(pointId ? { state: { focusedPointId: pointId } } : {}) };
}
