import { ArrowRight, Books, NotePencil } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { knowledgeGraph } from '../../../data/knowledgeGraph';
import { ROUTES } from '../../../app/routes';
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
          <h1 id="landing-title">把计算机知识变成可学习的路径。</h1>
          <p>
            探索知识关系，跟随分步教学完成讲解、练习与掌握验证。你也可以创建自己的知识库。
          </p>
          <div className="it-landing__actions">
            <button className="it-landing__primary" type="button" onClick={beginUniverseEntry} disabled={isEntering}>
              <span>{isEntering ? '正在进入' : '进入知识空间'}</span>
              <ArrowRight size={18} weight="regular" aria-hidden="true" />
            </button>
            <nav className="it-landing__secondary" aria-label="产品入口">
              <Link to={ROUTES.library}>
                <Books size={17} weight="regular" aria-hidden="true" />
                <span>我的知识库</span>
              </Link>
              <Link to={ROUTES.practice}>
                <NotePencil size={17} weight="regular" aria-hidden="true" />
                <span>刷题</span>
              </Link>
            </nav>
          </div>
        </motion.section>

        <motion.figure
          className="it-landing-network"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.97, rotateX: 3 }}
          animate={isEntering
            ? { opacity: 0, scale: 2.08, rotateX: 18, rotateZ: -3, x: '-4%' }
            : { opacity: 1, scale: 1, rotateX: 0, rotateZ: 0, x: 0 }}
          transition={{ duration: isEntering ? 0.65 : 1, delay: isEntering ? 0 : 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="it-landing-network__heading" aria-hidden="true">
            <span>计算机知识图谱</span>
            <b>{knowledgeGraph.nodes.length} 个节点</b>
          </div>
          <figcaption>俯视观察同一棵三维知识树，进入后可直接旋转、平移与缩放。</figcaption>
        </motion.figure>

        <motion.p
          className="it-landing__status"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: isEntering ? 0 : 1 }}
          transition={{ duration: 0.5, delay: isEntering ? 0 : 0.28 }}
        >
          当前内容：{knowledgeGraph.nodes.length} 个知识节点，4 个计算机学习方向
        </motion.p>
      </div>
    </main>
  );
}
