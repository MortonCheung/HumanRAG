import { describe, expect, it } from 'vitest';
import { ROUTES } from '../../app/routes';
import { getWorkspaceParent } from './parentNavigation';

describe('workspace parent navigation', () => {
  it('returns learning to the owning tree, independent of entry origin', () => {
    expect(getWorkspaceParent({ kind: 'learn', libraryId: 'computer', treeId: 'networks', pointId: 'tcp' }))
      .toEqual({ to: ROUTES.treeLearn('computer', 'networks') });
  });

  it('retains the point filter when leaving a point practice session', () => {
    expect(getWorkspaceParent({ kind: 'practice', libraryId: 'computer', treeId: 'networks', pointId: 'tcp' }))
      .toEqual({ to: ROUTES.treePractice('computer', 'networks'), state: { pointFilterId: 'tcp' } });
    expect(getWorkspaceParent({ kind: 'practice', libraryId: 'computer', treeId: 'networks' }))
      .toEqual({ to: ROUTES.treePractice('computer', 'networks') });
  });

  it('returns a library-wide or unresolved legacy session to the library', () => {
    expect(getWorkspaceParent({ kind: 'practice', libraryId: 'computer' }).to).toBe(ROUTES.library);
    expect(getWorkspaceParent({ kind: 'learn' }).to).toBe(ROUTES.library);
  });
});
