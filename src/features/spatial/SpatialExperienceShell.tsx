import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { TransitionLink as Link } from '../../app/pageNavigation';
import { usePageNavigate as useNavigate } from '../../app/pageNavigation';
import { GlobalNav } from '../../components/navigation/GlobalNav';
import { buildSceneModel } from '../../graph/relevance';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { ROUTES } from '../../app/routes';
import { SpatialExperienceContext, type SpatialExperiencePhase } from './SpatialExperienceContext';
import { UniversePage } from '../universe/pages/UniversePage';
import { LandingPage } from '../landing/pages/LandingPage';
import { SpatialViewportProvider } from './SpatialViewport';
import { SpatialStageCanvas } from './SpatialStageCanvas';
import { useSpatialStageStore, type SpatialStageMode } from './spatialStageStore';
import { canStartGoalTreeHandoff, useGoalTreeTransitionStore } from './transitions/goalTreeTransitionStore';

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Route changes replace only the DOM; one camera owns the entire entry shot. */
export function SpatialExperienceShell() {
  return <SpatialViewportProvider><SpatialExperience /></SpatialViewportProvider>;
}

function SpatialExperience() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = Boolean(useReducedMotion());
  const openingRoute = location.pathname === ROUTES.root;
  const directUniverse = location.pathname === ROUTES.universe;
  const spatialTreeMatch = matchPath('/library/:libraryId/tree/:treeId/*', location.pathname)
    ?? matchPath('/library/:libraryId/tree/:treeId', location.pathname);
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

  const model = useMemo(() => {
    return buildSceneModel({ goalId: selectedGoalId, selectedNodeId,
      hoveredNodeId: null, learningPath, focused: graphPhase !== 'overview', relationMode });
  }, [graphPhase, learningPath, relationMode, selectedGoalId, selectedNodeId]);
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
    document.querySelector<HTMLElement>('.spatial-experience > .context-nav')?.focus({ preventScroll: true });
  }, [phase]);
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
  useEffect(() => {
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
    startExtractionHandoff();
    selectTree(extractionTreeId);
    navigate(ROUTES.library, { state: { selectedTreeId: extractionTreeId }, viewTransition: false });
  }, [extractionPhase, extractionTreeId, extractionTreeReady, extractionVisualReady, navigate, selectTree, startExtractionHandoff]);
  useEffect(() => {
    if (extractionPhase !== 'handoff' || !libraryRoute) return;
    const timer = window.setTimeout(resetExtraction, 420);
    return () => window.clearTimeout(timer);
  }, [extractionPhase, libraryRoute, resetExtraction]);

  const extractionStatus = {
    highlighting: '已找到相关知识',
    detaching: '正在分离原有关系',
    receding: '正在收拢学习范围',
    forming: '正在形成知识树',
    connecting: '正在连接知识关系',
    ready: '知识树已经就绪',
  }[extractionPhase as Exclude<typeof extractionPhase, 'idle' | 'handoff'>];

  return (
    <SpatialExperienceContext.Provider value={{ phase, model, beginUniverseEntry, ready, pendingEntry }}>
      <div className={`spatial-experience spatial-experience--${phase}`} aria-busy={!ready && !failed} style={{ viewTransitionName: 'route-page' }}>
        <SceneBoundary key={attempt} onError={handleError}>
          <SpatialStageCanvas model={model} intent={cameraIntent} onHover={hoverNode} onSelect={selectNode}
            onMissed={() => hoverNode(null)} experiencePhase={phase} onReady={handleReady} onError={handleError}
            onEntryComplete={finishEntry} />
        </SceneBoundary>
        <GlobalNav concealed={(openingRoute || directUniverse) && phase !== 'settling' && phase !== 'universe'} />
        {(openingRoute || directUniverse) && <UniversePage />}
        {openingRoute && <LandingPage />}
        {!openingRoute && !directUniverse && <Outlet />}
        {failed && <section className="scene-recovery" role="alert"><p>知识空间未能加载</p><div>
          <button className="text-button" onClick={() => { setFailed(false); setCanvasReady(false); setAttempt((value) => value + 1); }}>重试</button>
          <Link className="text-button text-button--primary" to={ROUTES.library}>打开知识库</Link>
        </div></section>}
        {pendingEntry && !failed && <div className="entry-pending" role="status">正在准备知识空间 <button onClick={() => setPendingEntry(false)}>取消</button></div>}
        {extractionStatus && <div className="goal-extraction-status" role="status" aria-live="polite">{extractionStatus}</div>}
      </div>
    </SpatialExperienceContext.Provider>
  );
}
