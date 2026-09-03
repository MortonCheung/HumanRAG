import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GlobalNav } from '../../components/navigation/GlobalNav';
import { MobileNav } from '../../components/navigation/MobileNav';
import { buildSceneModel } from '../../graph/relevance';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { ROUTES } from '../../app/routes';
import { SpatialExperienceContext, type SpatialExperiencePhase } from './SpatialExperienceContext';

const KnowledgeFieldCanvas = lazy(() =>
  import('../../scene/UniverseCanvas').then((module) => ({ default: module.KnowledgeFieldCanvas })),
);

const ROUTE_SWITCH_MS = 360;
const ENTRY_COMPLETE_MS = 1120;

/**
 * 开屏与知识空间的持续空间容器。
 * Canvas 在两个路由之间不会卸载；路由只替换上层 DOM，相机因此可以从俯视连续转入斜视。
 */
export function SpatialExperienceShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const reducedMotion = Boolean(useReducedMotion());
  const timers = useRef<number[]>([]);
  const directUniverse = location.pathname === ROUTES.universe;
  const [phase, setPhase] = useState<SpatialExperiencePhase>(directUniverse ? 'universe' : 'landing');

  const graphPhase = useKnowledgeStore((state) => state.phase);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const learningPath = useKnowledgeStore((state) => state.learningPath);
  const relationMode = useKnowledgeStore((state) => state.relationMode);
  const cameraIntent = useKnowledgeStore((state) => state.cameraIntent);
  const hoverNode = useKnowledgeStore((state) => state.hoverNode);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const prepareUniverseEntry = useKnowledgeStore((state) => state.prepareUniverseEntry);

  const model = useMemo(
    () => {
      const prelude = phase === 'landing' || phase === 'entering';
      return buildSceneModel({
      goalId: prelude ? null : selectedGoalId,
      selectedNodeId: prelude ? null : selectedNodeId,
      hoveredNodeId: null,
      learningPath: prelude ? [] : learningPath,
      focused: !prelude && graphPhase !== 'overview',
      relationMode: prelude ? 'primary' : relationMode,
    });
    },
    [graphPhase, learningPath, phase, relationMode, selectedGoalId, selectedNodeId],
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const beginUniverseEntry = useCallback(() => {
    if (phase !== 'landing') return;
    clearTimers();
    prepareUniverseEntry();
    if (reducedMotion) {
      setPhase('universe');
      navigate(ROUTES.universe);
      return;
    }
    setPhase('entering');
    timers.current.push(window.setTimeout(() => navigate(ROUTES.universe), ROUTE_SWITCH_MS));
    timers.current.push(window.setTimeout(() => setPhase('universe'), ENTRY_COMPLETE_MS));
  }, [clearTimers, navigate, phase, prepareUniverseEntry, reducedMotion]);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (location.pathname === ROUTES.root && phase !== 'entering') setPhase('landing');
    if (location.pathname === ROUTES.universe && phase === 'landing') setPhase('universe');
  }, [location.pathname, phase]);

  const context = useMemo(() => ({ phase, model, beginUniverseEntry }), [beginUniverseEntry, model, phase]);

  return (
    <SpatialExperienceContext.Provider value={context}>
      <div className={`spatial-experience spatial-experience--${phase}`}>
        <Suspense fallback={<div className="canvas-fallback" aria-hidden="true" />}>
          <KnowledgeFieldCanvas
            model={model}
            intent={cameraIntent}
            onHover={hoverNode}
            onSelect={selectNode}
            onMissed={() => hoverNode(null)}
            experiencePhase={phase}
          />
        </Suspense>
        {directUniverse && (
          <>
            <GlobalNav />
            <MobileNav />
          </>
        )}
        <Outlet />
      </div>
    </SpatialExperienceContext.Provider>
  );
}
