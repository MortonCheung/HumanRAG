import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { BEFORE_PAGE_NAVIGATION_EVENT, TransitionLink as Link, usePageNavigate as useNavigate } from '../../app/pageNavigation';
import { buildSceneModel } from '../../graph/relevance';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { ROUTES } from '../../app/routes';
import { SpatialExperienceContext, type SpatialExperiencePhase } from './SpatialExperienceContext';
import { UniversePage } from '../universe/pages/UniversePage';
import { LandingPage } from '../landing/pages/LandingPage';
import { SpatialStageCanvas } from './SpatialStageCanvas';
import { useSpatialStageStore, type SpatialStageMode } from './spatialStageStore';
import { canStartGoalTreeHandoff, GOAL_TREE_HANDOFF_MS, GOAL_TREE_STABLE_FRAME_MS, useGoalTreeTransitionStore } from './transitions/goalTreeTransitionStore';
import { useProgressStore } from '../../store/progressStore';
import { useUserStore } from '../../store/userStore';
import { deriveLearningStateFromEvidence } from '../../domain/learning/deriveLearningState';
import { knowledgeGraph } from '../../data/knowledgeGraph';
import { useChromeVisibility } from '../../app/RootChromeShell';
import { capturePublishedUniverseView, type UniverseCameraSnapshot } from '../../scene/CameraController';

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Route changes replace only the DOM; one camera owns the entire entry shot. */
export function SpatialExperienceShell() {
  return <SpatialExperience />;
}

function SpatialExperience() {
  const location = useLocation();
  const { revealOpeningChrome } = useChromeVisibility();
  const navigate = useNavigate();
  const reducedMotion = Boolean(useReducedMotion());
  const openingRoute = location.pathname === ROUTES.root;
  const directUniverse = location.pathname === ROUTES.universe;
  const navigation = useRef({ key: location.key, pathname: location.pathname, returningToUniverse: false, reentryKey: 0 });
  if (navigation.current.key !== location.key) {
    const previousPath = navigation.current.pathname;
    const returningToUniverse = directUniverse && (
      previousPath === ROUTES.library
      || Boolean(matchPath('/library/:libraryId/tree/:treeId/*', previousPath))
      || Boolean(matchPath('/library/:libraryId/tree/:treeId', previousPath))
    );
    navigation.current = {
      key: location.key,
      pathname: location.pathname,
      returningToUniverse,
      reentryKey: navigation.current.reentryKey + (returningToUniverse ? 1 : 0),
    };
  }
  const { returningToUniverse, reentryKey } = navigation.current;
  const lastUniverseSnapshot = useRef<UniverseCameraSnapshot | null>(null);
  const spatialTreeMatch = matchPath('/library/:libraryId/tree/:treeId/*', location.pathname)
    ?? matchPath('/library/:libraryId/tree/:treeId', location.pathname);
  // Path / Verify workspaces are display models; the tree stage is readonly there.
  const treeWorkspaceReadOnly = Boolean(spatialTreeMatch && (location.pathname.endsWith('/path') || location.pathname.endsWith('/verify')));
  const libraryRoute = location.pathname === ROUTES.library;
  const [phase, setPhase] = useState<SpatialExperiencePhase>(openingRoute ? 'intro' : 'universe');
  const [canvasReady, setCanvasReady] = useState(false);
  // UI is eagerly mounted below; readiness now refers to the final rendered scene.
  const ready = canvasReady;
  const [failed, setFailed] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  const entryFocusPending = useRef(false);
  const graphPhase = useKnowledgeStore((state) => state.phase);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const learningPath = useKnowledgeStore((state) => state.learningPath);
  const relationMode = useKnowledgeStore((state) => state.relationMode);
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
  const cameraIntent = useKnowledgeStore((state) => state.cameraIntent);
  const hoverNode = useKnowledgeStore((state) => state.hoverNode);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const setStageMode = useSpatialStageStore((state) => state.setMode);
  const selectTree = useSpatialStageStore((state) => state.selectTree);
  const extractionPhase = useGoalTreeTransitionStore((state) => state.phase);
  const extractionTreeId = useGoalTreeTransitionStore((state) => state.treeId);
  const extractionTreeReady = useGoalTreeTransitionStore((state) => state.treeReady);
  const extractionVisualReady = useGoalTreeTransitionStore((state) => state.visualReady);
  const startExtractionHandoff = useGoalTreeTransitionStore((state) => state.startHandoff);
  const resetExtraction = useGoalTreeTransitionStore((state) => state.reset);

  useEffect(() => {
    const rememberBeforeNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ from: string; to: string }>).detail;
      if (!detail || (detail.from !== ROUTES.root && detail.from !== ROUTES.universe)) return;
      lastUniverseSnapshot.current = capturePublishedUniverseView(cameraIntent.id) ?? lastUniverseSnapshot.current;
    };
    window.addEventListener(BEFORE_PAGE_NAVIGATION_EVENT, rememberBeforeNavigation);
    return () => window.removeEventListener(BEFORE_PAGE_NAVIGATION_EVENT, rememberBeforeNavigation);
  }, [cameraIntent.id]);

  const model = useMemo(() => {
    const learningStates = new Map(knowledgeGraph.nodes.map((node) => [node.id, deriveLearningStateFromEvidence(node.id, learnerId, evidence)] as const));
    return buildSceneModel({ goalId: selectedGoalId, selectedNodeId,
      hoveredNodeId: null, learningPath, focused: graphPhase !== 'overview', relationMode, learningStates });
  }, [evidence, graphPhase, learnerId, learningPath, relationMode, selectedGoalId, selectedNodeId]);
  const finishEntry = useCallback(() => {
    if (!mounted.current) return;
    entryFocusPending.current = true;
    setPhase('universe');
    setPendingEntry(false);
  }, []);
  const handleReady = useCallback(() => { setCanvasReady(true); setFailed(false); }, []);
  const handleError = useCallback(() => { setFailed(true); setCanvasReady(false); setPendingEntry(false); }, []);
  const beginUniverseEntry = useCallback(() => {
    if (phase !== 'intro') return;
    if (!ready) { setPendingEntry(true); return; }
    setPendingEntry(false);
    if (reducedMotion) finishEntry();
    else setPhase('awakening');
  }, [finishEntry, phase, ready, reducedMotion]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (phase !== 'universe' || !entryFocusPending.current) return;
    entryFocusPending.current = false;
    document.querySelector<HTMLElement>('header.context-nav')?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    if (openingRoute && (phase === 'settling' || phase === 'universe')) revealOpeningChrome(location.key);
  }, [location.key, openingRoute, phase, revealOpeningChrome]);
  useEffect(() => { if (pendingEntry && ready) beginUniverseEntry(); }, [beginUniverseEntry, pendingEntry, ready]);
  useEffect(() => {
    if (phase !== 'awakening') return;
    const timer = window.setTimeout(() => setPhase('settling'), 1050);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (ready || failed) return;
    const timeout = window.setTimeout(handleError, 8000);
    return () => window.clearTimeout(timeout);
  }, [attempt, failed, handleError, ready]);
  useLayoutEffect(() => {
    // Only an actual route change resets the stage; completing a shot is not a new landing.
    setPhase(openingRoute ? 'intro' : 'universe');
    const mode: SpatialStageMode = spatialTreeMatch ? 'tree' : libraryRoute ? 'library' : openingRoute ? 'intro' : 'universe';
    setStageMode(mode);
    if (spatialTreeMatch?.params.treeId) selectTree(spatialTreeMatch.params.treeId);
  }, [libraryRoute, openingRoute, selectTree, setStageMode, spatialTreeMatch?.params.treeId]);
  useEffect(() => {
    if (openingRoute && phase !== 'intro') setStageMode('universe');
  }, [openingRoute, phase, setStageMode]);
  useEffect(() => {
    const gate = { phase: extractionPhase, treeReady: extractionTreeReady, visualReady: extractionVisualReady, treeId: extractionTreeId };
    if (!canStartGoalTreeHandoff(gate) || !extractionTreeId) return;
    const handoff = () => {
      startExtractionHandoff();
      selectTree(extractionTreeId);
      navigate(ROUTES.library, {
        state: { selectedTreeId: extractionTreeId, fromGoalExtraction: true },
        viewTransition: false,
      });
    };
    if (reducedMotion) {
      handoff();
      return;
    }
    const timer = window.setTimeout(handoff, GOAL_TREE_STABLE_FRAME_MS);
    return () => window.clearTimeout(timer);
  }, [extractionPhase, extractionTreeId, extractionTreeReady, extractionVisualReady, navigate, reducedMotion, selectTree, startExtractionHandoff]);
  useEffect(() => {
    if (extractionPhase !== 'handoff' || !libraryRoute) return;
    const timer = window.setTimeout(resetExtraction, GOAL_TREE_HANDOFF_MS + 30);
    return () => window.clearTimeout(timer);
  }, [extractionPhase, libraryRoute, resetExtraction]);

  const extractionStatus = extractionPhase === 'idle' || extractionPhase === 'handoff'
    ? null
    : '正在整理…';

  return (
    <SpatialExperienceContext.Provider value={{ phase, model, beginUniverseEntry, ready, pendingEntry, returningToUniverse, reentryKey }}>
      <div className={`spatial-experience spatial-experience--${phase}${treeWorkspaceReadOnly ? ' spatial-experience--readonly' : ''}`} aria-busy={!ready && !failed} data-returning-to-universe={returningToUniverse || undefined} data-reentry-key={reentryKey} style={{ viewTransitionName: 'route-page' }}>
        <SceneBoundary key={attempt} onError={handleError}>
          <SpatialStageCanvas model={model} intent={cameraIntent} onHover={hoverNode} onSelect={selectNode}
            onMissed={() => hoverNode(null)} experiencePhase={phase} onReady={handleReady} onError={handleError}
            onEntryComplete={finishEntry} treeReadOnly={treeWorkspaceReadOnly} returningToUniverse={returningToUniverse} reentryKey={reentryKey} universeRouteActive={openingRoute || directUniverse} reentrySnapshot={returningToUniverse ? lastUniverseSnapshot.current : null} />
        </SceneBoundary>
        {(openingRoute || directUniverse) && <UniversePage />}
        {openingRoute && <LandingPage />}
        {!openingRoute && !directUniverse && <Outlet />}
        {failed && <section className="scene-recovery" role="alert"><p>知识空间未能加载</p><div>
          <button className="text-button" onClick={() => { setFailed(false); setCanvasReady(false); setAttempt((value) => value + 1); }}>重试</button>
          <Link className="text-button text-button--primary" to={ROUTES.library}>打开知识库</Link>
        </div></section>}
        {pendingEntry && !failed && <div className="entry-pending" role="status">正在准备知识空间 <button onClick={() => setPendingEntry(false)}>取消</button></div>}
        {extractionStatus && <div className="goal-extraction-status" data-extraction-phase={extractionPhase} role="status" aria-live="polite">{extractionStatus}</div>}
      </div>
    </SpatialExperienceContext.Provider>
  );
}
