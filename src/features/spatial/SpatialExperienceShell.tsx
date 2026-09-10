import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TransitionLink as Link } from '../../app/pageNavigation';
import { GlobalNav } from '../../components/navigation/GlobalNav';
import { buildSceneModel } from '../../graph/relevance';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { ROUTES } from '../../app/routes';
import { SpatialExperienceContext, type SpatialExperiencePhase } from './SpatialExperienceContext';
import { loadUniversePage } from '../universe/loadUniversePage';

const KnowledgeFieldCanvas = lazy(() => import('../../scene/UniverseCanvas').then((module) => ({ default: module.KnowledgeFieldCanvas })));

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Route changes replace only the DOM; one camera owns the entire entry shot. */
export function SpatialExperienceShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = Boolean(useReducedMotion());
  const directUniverse = location.pathname === ROUTES.universe;
  const [phase, setPhase] = useState<SpatialExperiencePhase>(directUniverse ? 'universe' : 'landing');
  const [canvasReady, setCanvasReady] = useState(false);
  const [interfaceReady, setInterfaceReady] = useState(false);
  const ready = canvasReady && interfaceReady;
  const [failed, setFailed] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [skipVersion, setSkipVersion] = useState(0);
  const mounted = useRef(true);
  const path = useRef(location.pathname);
  path.current = location.pathname;
  const graphPhase = useKnowledgeStore((state) => state.phase);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const learningPath = useKnowledgeStore((state) => state.learningPath);
  const relationMode = useKnowledgeStore((state) => state.relationMode);
  const cameraIntent = useKnowledgeStore((state) => state.cameraIntent);
  const hoverNode = useKnowledgeStore((state) => state.hoverNode);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const prepareUniverseEntry = useKnowledgeStore((state) => state.prepareUniverseEntry);

  const model = useMemo(() => {
    const prelude = phase !== 'universe';
    return buildSceneModel({ goalId: prelude ? null : selectedGoalId, selectedNodeId: prelude ? null : selectedNodeId,
      hoveredNodeId: null, learningPath: prelude ? [] : learningPath, focused: !prelude && graphPhase !== 'overview',
      relationMode: prelude ? 'primary' : relationMode });
  }, [graphPhase, learningPath, phase, relationMode, selectedGoalId, selectedNodeId]);

  const commitRoute = useCallback(() => {
    if (!mounted.current || path.current === ROUTES.universe) return;
    void navigate(ROUTES.universe);
  }, [navigate]);
  const finishEntry = useCallback(() => {
    if (!mounted.current) return;
    setPhase('universe');
    setPendingEntry(false);
    commitRoute();
  }, [commitRoute]);
  const handleReady = useCallback(() => { setCanvasReady(true); setFailed(false); }, []);
  const handleError = useCallback(() => { setFailed(true); setCanvasReady(false); setPendingEntry(false); }, []);
  const beginUniverseEntry = useCallback(() => {
    if (phase !== 'landing') return;
    if (!ready) { setPendingEntry(true); return; }
    prepareUniverseEntry();
    setPendingEntry(false);
    if (reducedMotion) finishEntry();
    else setPhase('entering');
  }, [finishEntry, phase, prepareUniverseEntry, ready, reducedMotion]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void loadUniversePage().then(() => { if (active) setInterfaceReady(true); }, () => { if (active) handleError(); });
    return () => { active = false; };
  }, [attempt, handleError]);
  useEffect(() => { if (pendingEntry && ready) beginUniverseEntry(); }, [beginUniverseEntry, pendingEntry, ready]);
  useEffect(() => {
    if (ready || failed) return;
    const timeout = window.setTimeout(handleError, 8000);
    return () => window.clearTimeout(timeout);
  }, [attempt, failed, handleError, ready]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (phase === 'entering') { event.preventDefault(); setSkipVersion((value) => value + 1); }
      else if (pendingEntry) setPendingEntry(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [pendingEntry, phase]);
  useEffect(() => {
    // Only an actual route change resets the stage; completing a shot is not a new landing.
    setPhase(directUniverse ? 'universe' : 'landing');
  }, [directUniverse]);

  return (
    <SpatialExperienceContext.Provider value={{ phase, model, beginUniverseEntry, ready, pendingEntry }}>
      <div className={`spatial-experience spatial-experience--${phase}`} style={{ viewTransitionName: 'route-page' }}>
        <SceneBoundary key={attempt} onError={handleError}>
          <Suspense fallback={<div className="canvas-fallback" aria-hidden="true" />}>
            <KnowledgeFieldCanvas model={model} intent={cameraIntent} onHover={hoverNode} onSelect={selectNode}
              onMissed={() => hoverNode(null)} experiencePhase={phase} onReady={handleReady} onError={handleError}
              onEntryComplete={finishEntry} skipVersion={skipVersion} />
          </Suspense>
        </SceneBoundary>
        {directUniverse && <GlobalNav />}
        <Outlet />
        {phase === 'entering' && <button className="entry-skip" onClick={() => setSkipVersion((value) => value + 1)}>跳过动画 <kbd>Esc</kbd></button>}
        {failed && <section className="scene-recovery" role="alert"><p>知识空间未能加载</p><div>
          <button className="text-button" onClick={() => { setFailed(false); setCanvasReady(false); setAttempt((value) => value + 1); }}>重试</button>
          <Link className="text-button text-button--primary" to={ROUTES.library}>打开知识库</Link>
        </div></section>}
        {pendingEntry && !failed && <div className="entry-pending" role="status">正在准备知识空间 <button onClick={() => setPendingEntry(false)}>取消</button></div>}
      </div>
    </SpatialExperienceContext.Provider>
  );
}
