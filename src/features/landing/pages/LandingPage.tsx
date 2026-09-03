import { ArrowRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useSpatialExperience } from '../../spatial/SpatialExperienceContext';
import '../../../design/landing.css';

export function LandingPage() {
  const reducedMotion = useReducedMotion();
  const { phase, beginUniverseEntry } = useSpatialExperience();
  const isEntering = phase === 'entering';

  return (
    <main className={`it-landing${isEntering ? ' is-entering' : ''}`}>
      <div className="it-landing__frame">
        <motion.header
          className="it-landing__brand"
          initial={reducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: isEntering ? 0 : 1, y: isEntering ? -8 : 0 }}
          transition={{ duration: isEntering ? 0.28 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="it-landing__wordmark">iTeach</span>
          <span className="it-landing__product">AI 教学系统</span>
        </motion.header>

        <motion.section
          className="it-landing__copy"
          aria-labelledby="landing-title"
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: isEntering ? 0 : 1, y: isEntering ? -16 : 0 }}
          transition={{ duration: isEntering ? 0.34 : 0.72, delay: isEntering ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 id="landing-title"><span>计算机知识</span><span>一张图学明白</span></h1>
          <p>选择知识点，查看关系，开始学习或练习。</p>
          <div className="it-landing__actions">
            <button className="it-landing__primary" type="button" onClick={beginUniverseEntry} disabled={isEntering}>
              <span>{isEntering ? '正在进入' : '进入知识空间'}</span>
              <ArrowRight size={18} weight="regular" aria-hidden="true" />
            </button>
          </div>
        </motion.section>

        <motion.div
          className="it-landing-network"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: isEntering ? 0 : 1 }}
          transition={{ duration: isEntering ? 0.42 : 0.85, delay: isEntering ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </main>
  );
}
