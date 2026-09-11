import { ArrowRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useSpatialExperience } from '../../spatial/SpatialExperienceContext';
import { useProgressStore } from '../../../store/progressStore';
import { useKnowledgeStore } from '../../../store/knowledgeStore';
import { getLearningRecommendation } from '../../../ai/learningRecommendation';
import { knowledgeGraph, nodesById } from '../../../data/knowledgeGraph';
import { welcomePrompt } from '../welcomePrompt';
import '../../../design/landing.css';

export function LandingPage() {
  const reducedMotion = useReducedMotion();
  const { phase, beginUniverseEntry, pendingEntry } = useSpatialExperience();
  const [welcome] = useState(() => {
    const progress = useProgressStore.getState();
    const goalId = useKnowledgeStore.getState().selectedGoalId;
    const branch = goalId ? nodesById.get(goalId)?.branchId : undefined;
    const pointIds = branch ? knowledgeGraph.nodes.filter((node) => node.branchId === branch && node.type === 'knowledge').map((node) => node.id) : undefined;
    return welcomePrompt({ learnerId: progress.learnerId, evidence: progress.evidenceRecords, tasks: progress.remediationTasks,
      recommendation: pointIds ? getLearningRecommendation(progress.learnerId, pointIds) : null,
      variant: new Date().getDate() });
  });
  // The overlay retires without a route or scene handoff.
  const isEntering = phase !== 'landing';
  return (
    <main className={`it-landing${isEntering ? ' is-entering' : ''}`} inert={isEntering} aria-hidden={isEntering} hidden={phase === 'universe'}>
      <div className="it-landing__frame">
        <motion.header className="it-landing__brand" initial={false}
          animate={{ opacity: isEntering ? 0 : 1 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
          <span className="it-landing__glyph" aria-hidden="true"><i /><i /><i /></span>
          <span className="it-landing__wordmark">HumanRAG</span>
        </motion.header>
        <motion.section className="it-landing__copy" aria-labelledby="landing-title"
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: isEntering ? 0 : 1, y: isEntering ? -24 : 0 }}
          transition={{ duration: reducedMotion ? 0 : isEntering ? 0.3 : 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <h1 id="landing-title">{welcome.lines.map((line) => <span key={line}>{line}</span>)}</h1>
        </motion.section>
          <motion.div className="it-landing__actions" initial={false} animate={{ opacity: isEntering ? 0 : 1 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
            <button className="it-landing__primary" type="button" onClick={beginUniverseEntry} disabled={isEntering || pendingEntry}>
              <span>进入知识空间</span><ArrowRight size={20} aria-hidden="true" />
            </button>
          </motion.div>
      </div>
    </main>
  );
}
