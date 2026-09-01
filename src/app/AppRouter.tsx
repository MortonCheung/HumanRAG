import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ROUTES } from './routes';
import { SpatialExperienceShell } from '../features/spatial/SpatialExperienceShell';
import { migrateV9 } from '../domain/knowledge/migration';

const UniversePage = lazy(() => import('../features/universe/pages/UniversePage').then((module) => ({ default: module.UniversePage })));
const TeachingSessionPage = lazy(() => import('../features/teaching/pages/TeachingSessionPage').then((module) => ({ default: module.TeachingSessionPage })));
const PracticeSessionPage = lazy(() => import('../features/practice/pages/PracticeSessionPage').then((module) => ({ default: module.PracticeSessionPage })));
const LibraryHomePage = lazy(() => import('../features/library/pages/LibraryHomePage').then((module) => ({ default: module.LibraryHomePage })));
const ProgressPage = lazy(() => import('../features/progress/pages/ProgressPage').then((module) => ({ default: module.ProgressPage })));
const LandingPage = lazy(() => import('../features/landing/pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const KnowledgeTreePage = lazy(() => import('../features/knowledge-tree/pages/KnowledgeTreePage').then((module) => ({ default: module.KnowledgeTreePage })));
const TreeOverviewPage = lazy(() => import('../features/knowledge-tree/pages/TreeOverviewPage').then((module) => ({ default: module.TreeOverviewPage })));
const TreeLearningPage = lazy(() => import('../features/knowledge-tree/pages/TreeLearningPage').then((module) => ({ default: module.TreeLearningPage })));
const TreePracticePage = lazy(() => import('../features/knowledge-tree/pages/TreePracticePage').then((module) => ({ default: module.TreePracticePage })));
const TreeGenesisPage = lazy(() => import('../features/knowledge-tree-builder/pages/TreeGenesisPage').then((module) => ({ default: module.TreeGenesisPage })));
const TreeEditorShell = lazy(() => import('../features/knowledge-tree-editor/TreeEditorShell').then((module) => ({ default: module.TreeEditorShell })));
const TreeStructureEditorPage = lazy(() => import('../features/knowledge-tree-editor/pages/TreeStructureEditorPage').then((module) => ({ default: module.TreeStructureEditorPage })));
const TreeContentEditorPage = lazy(() => import('../features/knowledge-tree-editor/pages/TreeContentEditorPage').then((module) => ({ default: module.TreeContentEditorPage })));
const TreeQuestionEditorPage = lazy(() => import('../features/knowledge-tree-editor/pages/TreeQuestionEditorPage').then((module) => ({ default: module.TreeQuestionEditorPage })));
const TreeSettingsPage = lazy(() => import('../features/knowledge-tree-editor/pages/TreeSettingsPage').then((module) => ({ default: module.TreeSettingsPage })));
const PointCreationShell = lazy(() => import('../features/knowledge-point-builder/PointCreationShell').then((module) => ({ default: module.PointCreationShell })));
const PointContentPage = lazy(() => import('../features/knowledge-point-builder/pages/PointContentPage').then((module) => ({ default: module.PointContentPage })));
const PointPlacementPage = lazy(() => import('../features/knowledge-point-builder/pages/PointPlacementPage').then((module) => ({ default: module.PointPlacementPage })));

export function AppRouter() {
  migrateV9();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SpatialExperienceShell />}>
          <Route path={ROUTES.root} element={<Suspense fallback={<div className="it-landing" />}><LandingPage /></Suspense>} />
          <Route path={ROUTES.universe} element={<Suspense fallback={<div className="page" />}><UniversePage /></Suspense>} />
        </Route>
        <Route element={<AppShell />}>
          <Route path={ROUTES.library} element={<Suspense fallback={<div className="page" />}><LibraryHomePage /></Suspense>} />
          <Route path="/library/:libraryId" element={<Navigate to={ROUTES.library} replace />} />
          <Route path="/library/:libraryId/practice" element={<Suspense fallback={<div className="page" />}><PracticeSessionPage /></Suspense>} />
          <Route path="/library/:libraryId/tree/:treeId" element={<Suspense fallback={<div className="page" />}><KnowledgeTreePage /></Suspense>}>
            <Route index element={<TreeOverviewPage />} />
            <Route path="learn" element={<TreeLearningPage />} />
            <Route path="practice" element={<TreePracticePage />} />
          </Route>
          <Route path="/library/:libraryId/tree/:treeId/practice/session" element={<Suspense fallback={<div className="page" />}><PracticeSessionPage /></Suspense>} />
          <Route path="/library/:libraryId/tree/:treeId/point/:pointId/learn" element={<Suspense fallback={<div className="page" />}><TeachingSessionPage /></Suspense>} />
          <Route path="/library/:libraryId/tree/:treeId/point/:pointId/practice" element={<Suspense fallback={<div className="page" />}><PracticeSessionPage /></Suspense>} />
          <Route path="/library/:libraryId/trees/new" element={<Suspense fallback={<div className="page" />}><TreeGenesisPage /></Suspense>} />
          <Route element={<Suspense fallback={<div className="page" />}><TreeEditorShell /></Suspense>}>
            <Route path="/library/:libraryId/tree/:treeId/edit/structure" element={<TreeStructureEditorPage />} />
            <Route path="/library/:libraryId/tree/:treeId/edit/content" element={<TreeContentEditorPage />} />
            <Route path="/library/:libraryId/tree/:treeId/edit/questions" element={<TreeQuestionEditorPage />} />
            <Route path="/library/:libraryId/tree/:treeId/edit/settings" element={<TreeSettingsPage />} />
          </Route>
          <Route element={<Suspense fallback={<div className="page" />}><PointCreationShell /></Suspense>}>
            <Route path="/library/:libraryId/tree/:treeId/points/new/content" element={<PointContentPage />} />
            <Route path="/library/:libraryId/tree/:treeId/points/new/place" element={<PointPlacementPage />} />
          </Route>
          <Route path={ROUTES.progress} element={<Suspense fallback={<div className="page" />}><ProgressPage /></Suspense>} />
        </Route>
        <Route path="/teach" element={<Navigate to={ROUTES.library} replace />} />
        <Route path="/teach/:unitId" element={<Suspense fallback={<div className="page" />}><TeachingSessionPage /></Suspense>} />
        <Route path="/practice" element={<Navigate to={ROUTES.library} replace />} />
        <Route path="/practice/session/:sessionId" element={<Suspense fallback={<div className="page" />}><PracticeSessionPage /></Suspense>} />
        <Route path="/library/new" element={<Navigate to={ROUTES.treeNew('computer')} replace />} />
        <Route path="/library/:libraryId/edit" element={<Navigate to={ROUTES.library} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.root} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
