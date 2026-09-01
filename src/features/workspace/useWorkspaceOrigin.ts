import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { WorkspaceOrigin } from '../../domain/knowledge/types';

export function useWorkspaceOrigin(): WorkspaceOrigin | null {
  const location = useLocation();
  return useMemo(() => {
    const state = location.state as { origin?: WorkspaceOrigin } | undefined;
    return state?.origin ?? null;
  }, [location.state]);
}
