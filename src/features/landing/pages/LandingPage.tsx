import { ArrowRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useSpatialExperience } from '../../spatial/SpatialExperienceContext';
import '../../../design/landing.css';

export function LandingPage() {
  const reducedMotion = useReducedMotion();
  const { phase, beginUniverseEntry, pendingEntry } = useSpatialExperience();
  // Stay dismissed while the completed shot waits for the Universe route commit.
  const isEntering = phase !== 'landing';
  return (
    <main className={`it-landing${isEntering ? ' is-entering' : ''}`} inert={isEntering}>
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
          <h1 id="landing-title"><span>学会你</span><span>想做的事<span className="it-landing__period">。</span></span></h1>
          <div className="it-landing__actions">
            <button className="it-landing__primary" type="button" onClick={beginUniverseEntry} disabled={isEntering || pendingEntry}>
              <span>进入知识空间</span><ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
