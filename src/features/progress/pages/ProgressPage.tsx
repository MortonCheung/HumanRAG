import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { TransitionLink as Link, usePageNavigate } from '../../../app/pageNavigation';
import { useUserStore } from '../../../store/userStore';
import { useProgressStore } from '../../../store/progressStore';
import { contentRepository } from '../../../services/content/ContentRepository';
import { MISCONCEPTIONS_BY_ID } from '../../../data/v6/catalogs/misconceptionCatalog';
import { LEARNER_PROFILES } from '../../../data/v6/catalogs/learnerProfileCatalog';
import { TCP_FRAGMENTS } from '../../../data/v6/handcrafted/tcpLesson';
import { WorkspaceHeader } from '../../workspace/WorkspaceHeader';
import { deriveLearningStateFromEvidence, type LearningState } from '../../../domain/learning/deriveLearningState';
import { BRANCH_TO_TREE_ID } from '../../../domain/knowledge/catalog';
import { ROUTES } from '../../../app/routes';
import { getLearningRecommendation } from '../../../ai/learningRecommendation';
import { useLearningQuestionStore } from '../../../domain/learning/learningQuestions';
import { DOMAIN_COLORS } from '../../../design/domainPalette';
import { MOTION } from '../../../motion/tokens';
import { buildLearningDashboardSnapshot } from '../learningDashboard';
import { LearningActivityHeatmap } from '../components/LearningActivityHeatmap';
import { LearningOverviewScene } from '../components/LearningOverviewScene';
import { LearningRecordDrawer } from '../components/LearningRecordDrawer';
import '../progress.css';

function misconceptionName(id: string) {
  return MISCONCEPTIONS_BY_ID.get(id)?.name
    ?? TCP_FRAGMENTS[id.replace('tcp-', '') as keyof typeof TCP_FRAGMENTS]?.label;
}

function percent(value: number | null) {
  return value === null ? '—' : String(Math.round(value * 100));
}

export function ProgressPage() {
  const navigate = usePageNavigate();
  const location = useLocation();
  const reducedMotion = Boolean(useReducedMotion());
  const returnContext = location.state as { returnTo?: string; returnState?: unknown } | null;
  const returnTo = returnContext?.returnTo && /^\/(universe(?:$|[?#])|library(?:\/|$)|teach\/|practice\/)/.test(returnContext.returnTo) ? returnContext.returnTo : '/library';
  const learnerId = useUserStore((state) => state.activeProfileId);
  const answerRecords = useProgressStore((state) => state.answerRecords);
  const evidenceRecords = useProgressStore((state) => state.evidenceRecords);
  const misconceptionRecords = useProgressStore((state) => state.misconceptionRecords);
  const tasks = useProgressStore((state) => state.remediationTasks);
  const storageError = useProgressStore((state) => state.storageError);
  const learningQuestions = useLearningQuestionStore((state) => state.questions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const fallbackActivityEnd = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId),
    [learnerId, learningQuestions, evidenceRecords, tasks],
  );
  const dashboard = useMemo(() => buildLearningDashboardSnapshot({
    learnerId,
    profiles: LEARNER_PROFILES,
    answerRecords,
    evidenceRecords,
    misconceptionRecords,
    resolveQuestion: (questionId) => contentRepository.getQuestion(questionId),
    resolveNode: (nodeId) => contentRepository.getNode(nodeId),
    resolveMisconceptionName: misconceptionName,
    recommendation,
    activityEndDate: fallbackActivityEnd,
  }), [answerRecords, evidenceRecords, fallbackActivityEnd, learnerId, misconceptionRecords, recommendation]);
  const recommendationAction = dashboard.recommendation
    ? actionForState(deriveLearningStateFromEvidence(dashboard.recommendation.pointId, learnerId, evidenceRecords))
    : 'study';
  const enter = (index: number) => ({
    initial: reducedMotion ? false as const : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reducedMotion ? 0 : MOTION.duration.content, delay: reducedMotion ? 0 : index * 0.04, ease: MOTION.ease.out },
  });

  return <div className="page progress-page">
    <WorkspaceHeader title="我的学习" backLabel="返回" onBack={() => navigate(returnTo, { state: returnContext?.returnState })} />
    <main className="learning-dashboard">
      <motion.header className="learning-dashboard__profile" {...enter(0)}>
        <div>
          <h1>{dashboard.profile.name}</h1>
          <p><span>{dashboard.profile.major}</span><span>{dashboard.profile.identity}</span><span>目标：{dashboard.profile.goal}</span></p>
        </div>
        <div className="learning-dashboard__profile-actions">
          <span className="demo-badge">DEMO DATA</span>
          <LearningRecordDrawer records={dashboard.learningRecords} open={drawerOpen} onOpen={() => setDrawerOpen(true)} onClose={() => setDrawerOpen(false)} />
        </div>
      </motion.header>
      {storageError && <p className="lesson-save-error learning-dashboard__error" role="alert">{storageError}</p>}

      <div className="learning-dashboard__grid">
        <motion.section className="learning-dashboard__panel learning-dashboard__overall" aria-labelledby="overall-performance-title" {...enter(1)}>
          <h2 id="overall-performance-title" className="learning-dashboard__kicker">OVERALL PERFORMANCE</h2>
          <div className="learning-dashboard__accuracy" aria-label={`整体正确率 ${dashboard.totals.accuracy === null ? '暂无' : `${percent(dashboard.totals.accuracy)}%`}`}>
            {percent(dashboard.totals.accuracy)}{dashboard.totals.accuracy !== null && <span>%</span>}
          </div>
          <p className="learning-dashboard__accuracy-label">Overall Accuracy</p>
          <dl className="learning-dashboard__metric-matrix">
            <div><dt>ANSWERS</dt><dd>{dashboard.totals.answered}</dd></div>
            <div><dt>CORRECT</dt><dd>{dashboard.totals.correct}</dd></div>
            <div><dt>INCORRECT</dt><dd>{dashboard.totals.incorrect}</dd></div>
            <div><dt>ACTIVE DAYS</dt><dd>{dashboard.totals.activeDays}</dd></div>
            <div><dt>LONGEST STREAK</dt><dd>{dashboard.totals.longestStreak}</dd></div>
            <div><dt>KNOWLEDGE POINTS</dt><dd>{dashboard.totals.touchedPoints}</dd></div>
          </dl>
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__domains" aria-labelledby="domain-performance-title" {...enter(2)}>
          <div className="learning-dashboard__section-heading">
            <h2 id="domain-performance-title" className="learning-dashboard__kicker">DOMAIN PERFORMANCE</h2>
            <span>ALL ANSWERS</span>
          </div>
          <div className="learning-dashboard__domain-list">
            {dashboard.branchStats.map((branch, index) => <article key={branch.branchId} className="learning-dashboard__domain">
              <div><strong>{branch.name}</strong><span>{branch.answered} answers · {branch.touchedPoints} points</span><b>{percent(branch.accuracy)}{branch.accuracy !== null && '%'}</b></div>
              <i aria-hidden="true"><motion.span
                initial={reducedMotion ? false : { width: 0 }}
                animate={{ width: `${(branch.accuracy ?? 0) * 100}%` }}
                transition={{ duration: reducedMotion ? 0 : 0.42, delay: reducedMotion ? 0 : 0.08 + index * 0.04, ease: MOTION.ease.out }}
                style={{ background: DOMAIN_COLORS[branch.branchId] }}
              /></i>
            </article>)}
          </div>
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__space" aria-labelledby="learning-space-title" {...enter(3)}>
          <div className="learning-dashboard__section-heading">
            <h2 id="learning-space-title" className="learning-dashboard__kicker">LEARNING SPACE</h2>
            <span>4 SYSTEM TREES</span>
          </div>
          <LearningOverviewScene />
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__activity" aria-labelledby="learning-activity-title" {...enter(4)}>
          <div className="learning-dashboard__section-heading learning-dashboard__activity-heading">
            <h2 id="learning-activity-title" className="learning-dashboard__kicker">LEARNING ACTIVITY</h2>
            <p><span>ACTIVE <b>{dashboard.totals.activeDays}</b> DAYS</span><span>LONGEST <b>{dashboard.totals.longestStreak}</b> DAYS</span></p>
          </div>
          <LearningActivityHeatmap activity={dashboard.activity} range={dashboard.activityRange} />
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__attention" aria-labelledby="needs-attention-title" {...enter(5)}>
          <div className="learning-dashboard__section-heading">
            <h2 id="needs-attention-title" className="learning-dashboard__kicker">NEEDS ATTENTION</h2>
            <span>{dashboard.totals.openMisconceptions} OPEN</span>
          </div>
          <div className="learning-dashboard__attention-list">
            {dashboard.attention.length ? dashboard.attention.map((item) => <Link key={item.id} to={actionPath(item.nodeId, 'teach')}>
              <i aria-hidden="true" /><span><strong>{item.name}</strong><small>{item.nodeName}</small></span><b>{item.occurrences} 次</b>
            </Link>) : <p>当前没有待处理误区。</p>}
          </div>
          <div className="learning-dashboard__next">
            <span className="learning-dashboard__kicker">NEXT</span>
            {dashboard.recommendation ? <>
              <strong>{dashboard.recommendation.pointName}</strong>
              <p>{dashboard.recommendation.reasons[0]}</p>
              <Link className="learning-dashboard__cta" to={actionPath(dashboard.recommendation.pointId, recommendationAction)}>
                {recommendationAction === 'teach' ? '带我巩固' : recommendationAction === 'verify' ? '再测一次' : '从这里继续'} <ArrowRight size={16} />
              </Link>
            </> : <>
              <strong>选择新的方向</strong><p>当前范围已完成独立验证。</p>
              <Link className="learning-dashboard__cta" to={ROUTES.library}>打开知识库 <ArrowRight size={16} /></Link>
            </>}
          </div>
        </motion.section>
      </div>
    </main>
  </div>;
}

function actionForState(state: LearningState): 'study' | 'teach' | 'verify' {
  return state === 'needs-reinforcement' ? 'teach' : state === 'verified' || state === 'unknown' || state === 'learning' ? 'study' : 'verify';
}

function actionPath(pointId: string, action: 'study' | 'teach' | 'verify') {
  const node = contentRepository.getNode(pointId);
  if (!node) return ROUTES.library;
  const treeId = BRANCH_TO_TREE_ID[node.branchId];
  return action === 'teach' ? ROUTES.pointTeach('computer', treeId, pointId)
    : action === 'verify' ? ROUTES.pointVerify('computer', treeId, pointId)
      : ROUTES.pointStudy('computer', treeId, pointId);
}
