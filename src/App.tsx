import { lazy, Suspense, useEffect, useMemo } from 'react';
import { ExplorerInterface } from './components/ExplorerInterface';
import { OnboardingScreen } from './components/OnboardingScreen';
import { buildSceneModel } from './graph/relevance';
import { useKnowledgeStore } from './store/knowledgeStore';

const KnowledgeFieldCanvas = lazy(() => import('./scene/UniverseCanvas').then((module) => ({ default: module.KnowledgeFieldCanvas })));

export default function App() {
  const phase = useKnowledgeStore((state) => state.phase);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const hoveredNodeId = useKnowledgeStore((state) => state.hoveredNodeId);
  const learningPath = useKnowledgeStore((state) => state.learningPath);
  const cameraIntent = useKnowledgeStore((state) => state.cameraIntent);
  const hoverNode = useKnowledgeStore((state) => state.hoverNode);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const closeNodeDetail = useKnowledgeStore((state) => state.closeNodeDetail);

  const model = useMemo(
    () => buildSceneModel({
      goalId: selectedGoalId,
      selectedNodeId,
      hoveredNodeId,
      learningPath,
      focused: phase === 'goalFocused' || phase === 'nodeFocused' || phase === 'enteringUniverse',
    }),
    [hoveredNodeId, learningPath, phase, selectedGoalId, selectedNodeId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === 'Escape') {
        if (useKnowledgeStore.getState().selectedNodeId) closeNodeDetail();
      }
      if (event.key.toLowerCase() === 'r' && !['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '')) {
        useKnowledgeStore.getState().returnOverview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeNodeDetail]);

  return (
    <main id="knowledge-field-app" className={`app-shell app-shell--${phase}`}>
      {phase !== 'onboarding' && (
        <Suspense fallback={<div className="canvas-fallback" aria-hidden="true" />}>
          <KnowledgeFieldCanvas
            model={model}
            intent={cameraIntent}
            onHover={hoverNode}
            onSelect={selectNode}
            onMissed={() => {
              if (selectedNodeId) closeNodeDetail();
            }}
          />
        </Suspense>
      )}
      <div className="field-light" aria-hidden="true" />
      <div className="dom-layer">
        {phase === 'onboarding' ? <OnboardingScreen /> : <ExplorerInterface />}
      </div>
    </main>
  );
}
