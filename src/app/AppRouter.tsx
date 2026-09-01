import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ROUTES } from './routes';
import { SpatialExperienceShell } from '../features/spatial/SpatialExperienceShell';

const UniversePage = lazy(() => import('../features/universe/pages/UniversePage').then((module) => ({ default: module.UniversePage })));
const TeachingHomePage = lazy(() => import('../features/teaching/pages/TeachingHomePage').then((module) => ({ default: module.TeachingHomePage })));
const TeachingSessionPage = lazy(() => import('../features/teaching/pages/TeachingSessionPage').then((module) => ({ default: module.TeachingSessionPage })));
const PracticeHomePage = lazy(() => import('../features/practice/pages/PracticeHomePage').then((module) => ({ default: module.PracticeHomePage })));
const PracticeSessionPage = lazy(() => import('../features/practice/pages/PracticeSessionPage').then((module) => ({ default: module.PracticeSessionPage })));
const LibraryHomePage = lazy(() => import('../features/library/pages/LibraryHomePage').then((module) => ({ default: module.LibraryHomePage })));
const LibraryDetailPage = lazy(() => import('../features/library/pages/LibraryDetailPage').then((module) => ({ default: module.LibraryDetailPage })));
const LibraryBuilderPage = lazy(() => import('../features/library-builder/pages/LibraryBuilderPage').then((module) => ({ default: module.LibraryBuilderPage })));
const ProgressPage = lazy(() => import('../features/progress/pages/ProgressPage').then((module) => ({ default: module.ProgressPage })));
const LandingPage = lazy(() => import('../features/landing/pages/LandingPage').then((module) => ({ default: module.LandingPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SpatialExperienceShell />}>
          <Route path={ROUTES.root} element={<Suspense fallback={<div className="it-landing" />}><LandingPage /></Suspense>} />
          <Route path={ROUTES.universe} element={<Suspense fallback={<div className="page" />}><UniversePage /></Suspense>} />
        </Route>
        <Route element={<AppShell />}>
          <Route path={ROUTES.teach} element={<Suspense fallback={<div className="page" />}><TeachingHomePage /></Suspense>} />
          <Route path="/teach/:unitId" element={<Suspense fallback={<div className="page" />}><TeachingSessionPage /></Suspense>} />
          <Route path={ROUTES.practice} element={<Suspense fallback={<div className="page" />}><PracticeHomePage /></Suspense>} />
          <Route path="/practice/session/:sessionId" element={<Suspense fallback={<div className="page" />}><PracticeSessionPage /></Suspense>} />
          <Route path={ROUTES.library} element={<Suspense fallback={<div className="page" />}><LibraryHomePage /></Suspense>} />
          <Route path="/library/new" element={<Suspense fallback={<div className="page" />}><LibraryBuilderPage /></Suspense>} />
          <Route path="/library/:libraryId/edit" element={<Suspense fallback={<div className="page" />}><LibraryBuilderPage /></Suspense>} />
          <Route path="/library/:libraryId" element={<Suspense fallback={<div className="page" />}><LibraryDetailPage /></Suspense>} />
          <Route path={ROUTES.progress} element={<Suspense fallback={<div className="page" />}><ProgressPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.root} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
