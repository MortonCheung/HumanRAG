import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider, useParams } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ROUTES } from './routes';
import { installRouteTransitionDirection } from './routeTransitions';
import { SpatialExperienceShell } from '../features/spatial/SpatialExperienceShell';
import { migrateV9 } from '../domain/knowledge/migration';

const teachingPage = async () => ({ Component: (await import('../features/teaching/pages/TeachingSessionPage')).TeachingSessionPage });
const practicePage = async () => ({ Component: (await import('../features/practice/pages/PracticeSessionPage')).PracticeSessionPage });
const initialView = <div role="status" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--it-text-soft)', background: 'var(--it-bg)' }}>正在打开…</div>;

function TreeContentRedirect() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  if (!libraryId || !treeId) return <Navigate to={ROUTES.library} replace />;
  return <Navigate to={ROUTES.treeEdit(libraryId, treeId, 'structure')} replace />;
}

migrateV9();
// Resolve page modules before committing a view, so snapshots contain the
// complete destination instead of a blank Suspense fallback.
const router = createBrowserRouter(createRoutesFromElements(
  <>
    <Route element={<SpatialExperienceShell />} hydrateFallbackElement={initialView}>
      <Route path={ROUTES.root} element={null} />
      <Route path={ROUTES.universe} element={null} />
    </Route>
    <Route element={<AppShell />} hydrateFallbackElement={initialView}>
      <Route path={ROUTES.library} lazy={async () => ({ Component: (await import('../features/library/pages/LibraryHomePage')).LibraryHomePage })} />
      <Route path="/library/:libraryId" element={<Navigate to={ROUTES.library} replace />} />
      <Route path="/library/:libraryId/practice" lazy={practicePage} />
      <Route path="/library/:libraryId/tree/:treeId" lazy={async () => ({ Component: (await import('../features/knowledge-tree/pages/KnowledgeTreePage')).KnowledgeTreePage })}>
        <Route index lazy={async () => ({ Component: (await import('../features/knowledge-tree/pages/TreeOverviewPage')).TreeOverviewPage })} />
        <Route path="learn" lazy={async () => ({ Component: (await import('../features/knowledge-tree/pages/TreeLearningPage')).TreeLearningPage })} />
        <Route path="practice" lazy={async () => ({ Component: (await import('../features/knowledge-tree/pages/TreePracticePage')).TreePracticePage })} />
      </Route>
      <Route path="/library/:libraryId/tree/:treeId/practice/session" lazy={practicePage} />
      <Route path="/library/:libraryId/tree/:treeId/point/:pointId/learn" lazy={teachingPage} />
      <Route path="/library/:libraryId/tree/:treeId/point/:pointId/practice" lazy={practicePage} />
      <Route path="/library/:libraryId/trees/new" lazy={async () => ({ Component: (await import('../features/knowledge-tree-builder/pages/TreeGenesisPage')).TreeGenesisPage })} />
      <Route lazy={async () => ({ Component: (await import('../features/knowledge-tree-editor/TreeEditorShell')).TreeEditorShell })}>
        <Route path="/library/:libraryId/tree/:treeId/edit/structure" lazy={async () => ({ Component: (await import('../features/knowledge-tree-editor/pages/TreeStructureEditorPage')).TreeStructureEditorPage })} />
        <Route path="/library/:libraryId/tree/:treeId/edit/content" element={<TreeContentRedirect />} />
        <Route path="/library/:libraryId/tree/:treeId/edit/questions" lazy={async () => ({ Component: (await import('../features/knowledge-tree-editor/pages/TreeQuestionEditorPage')).TreeQuestionEditorPage })} />
        <Route path="/library/:libraryId/tree/:treeId/edit/settings" lazy={async () => ({ Component: (await import('../features/knowledge-tree-editor/pages/TreeSettingsPage')).TreeSettingsPage })} />
      </Route>
      <Route lazy={async () => ({ Component: (await import('../features/knowledge-point-builder/PointCreationShell')).PointCreationShell })}>
        <Route path="/library/:libraryId/tree/:treeId/points/new/content" lazy={async () => ({ Component: (await import('../features/knowledge-point-builder/pages/PointContentPage')).PointContentPage })} />
        <Route path="/library/:libraryId/tree/:treeId/points/new/place" lazy={async () => ({ Component: (await import('../features/knowledge-point-builder/pages/PointPlacementPage')).PointPlacementPage })} />
      </Route>
      <Route path={ROUTES.progress} lazy={async () => ({ Component: (await import('../features/progress/pages/ProgressPage')).ProgressPage })} />
      <Route path="/teach/:unitId" lazy={teachingPage} />
      <Route path="/practice/session/:sessionId" lazy={practicePage} />
    </Route>
    <Route path="/teach" element={<Navigate to={ROUTES.library} replace />} />
    <Route path="/practice" element={<Navigate to={ROUTES.library} replace />} />
    <Route path="/library/new" element={<Navigate to={ROUTES.treeNew('computer')} replace />} />
    <Route path="/library/:libraryId/edit" element={<Navigate to={ROUTES.library} replace />} />
    <Route path="*" element={<Navigate to={ROUTES.root} replace />} />
  </>,
));

const unsubscribeTransitionDirection = installRouteTransitionDirection(router);
if (import.meta.hot) import.meta.hot.dispose(unsubscribeTransitionDirection);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
