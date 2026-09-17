import { MOTION } from '../../../motion/tokens';
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ExplorerInterface } from '../../../components/ExplorerInterface';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { useSpatialExperience } from '../../spatial/SpatialExperienceContext';
import { useGoalTreeTransitionStore } from '../../spatial/transitions/goalTreeTransitionStore';

/** 三维知识空间页面（蓝图 §5）。从原 App.tsx 迁移，功能不回退。 */
export function UniversePage() {
  const reducedMotion = Boolean(useReducedMotion());
  const { phase: experiencePhase, model, returningToUniverse, reentryKey } = useSpatialExperience();
  const phase = useKnowledgeStore((state) => state.phase);
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const hoverNode = useKnowledgeStore((state) => state.hoverNode);
  const closeNodeDetail = useKnowledgeStore((state) => state.closeNodeDetail);
  const closePanel = useKnowledgeStore((state) => state.closePanel);
  const openPanel = useKnowledgeStore((state) => state.openPanel);
  const returnOverview = useKnowledgeStore((state) => state.returnOverview);
  const extractionPhase = useGoalTreeTransitionStore((state) => state.phase);
  const extracting = extractionPhase !== 'idle' && extractionPhase !== 'handoff';

  useEffect(() => {
    if (experiencePhase !== 'universe') return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '');
      if (event.key === 'Escape') {
        if (activePanel) closePanel();
        else if (useKnowledgeStore.getState().selectedNodeId) closeNodeDetail();
        return;
      }
      if (!isTyping && (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'))) {
        event.preventDefault();
        openPanel('search');
      }
      if (!isTyping && event.key.toLowerCase() === 'r') returnOverview();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activePanel, closeNodeDetail, closePanel, openPanel, returnOverview, experiencePhase]);

  useEffect(() => () => hoverNode(null), [hoverNode]);

  return (
    <main id="knowledge-field-app" className={`app-shell universe-page app-shell--${phase}`} inert={experiencePhase !== 'universe' || extracting} aria-hidden={experiencePhase !== 'universe' || extracting}>
      <div className="field-light" aria-hidden="true" />
      <motion.div
        key={returningToUniverse ? `universe-reentry-${reentryKey}` : 'universe-stable'}
        className="dom-layer"
        initial={returningToUniverse && !reducedMotion ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: experiencePhase === 'settling' || experiencePhase === 'universe' ? 1 : 0, y: 0 }}
        transition={{ duration: MOTION.duration.content, ease: MOTION.ease.out }}
      >
        <ExplorerInterface model={model} />
      </motion.div>
    </main>
  );
}
