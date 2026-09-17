import { useMemo, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { TransitionLink as Link } from '../../../app/pageNavigation';
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
import { ProfileEditorDrawer } from '../components/ProfileEditorDrawer';
import { resolveLearnerProfile } from '../../../domain/learning/resolveLearnerProfile';
import '../progress.css';
import { useLocation } from 'react-router-dom';
import { usePicoPageContext } from '../../pico/PicoContextBridge';
import { useLearnerContextBundle } from '../../../ai/context/useLearnerContextBundle';
import { sendChat } from '../../../ai/chat/chatClient';
import { AI_SUBMISSION_COOLDOWN_MS, type ChatResult } from '../../../ai/chat/contracts';
import { buildInsightSignature, cachedInsight, cacheInsight, selectInsightContextBlocks } from '../learningInsight';

function misconceptionName(id: string) {
  return MISCONCEPTIONS_BY_ID.get(id)?.name
    ?? TCP_FRAGMENTS[id.replace('tcp-', '') as keyof typeof TCP_FRAGMENTS]?.label;
}

function percent(value: number | null) {
  return value === null ? '—' : String(Math.round(value * 100));
}

export function ProgressPage() {
  const reducedMotion = Boolean(useReducedMotion());
  const location = useLocation();
  const learnerId = useUserStore((state) => state.activeProfileId);
  const profileOverride = useUserStore((state) => state.profileOverrides[learnerId]);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const resetProfileOverride = useUserStore((state) => state.resetProfileOverride);
  const answerRecords = useProgressStore((state) => state.answerRecords);
  const evidenceRecords = useProgressStore((state) => state.evidenceRecords);
  const misconceptionRecords = useProgressStore((state) => state.misconceptionRecords);
  const tasks = useProgressStore((state) => state.remediationTasks);
  const storageError = useProgressStore((state) => state.storageError);
  const learningQuestions = useLearningQuestionStore((state) => state.questions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [insightState, setInsightState] = useState<{ signature: string; result: ChatResult } | null>(null);
  const [insightBusy, setInsightBusy] = useState(false);
  const [insightCooldownUntil, setInsightCooldownUntil] = useState(0);
  const { bundle: learnerContext } = useLearnerContextBundle();
  const fallbackActivityEnd = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const profiles = useMemo(() => LEARNER_PROFILES.map((profile) => (
    profile.id === learnerId ? resolveLearnerProfile(profile, profileOverride) : profile
  )), [learnerId, profileOverride]);
  const recommendation = useMemo(
    () => getLearningRecommendation(learnerId),
    [learnerId, learningQuestions, evidenceRecords, tasks],
  );
  const dashboard = useMemo(() => buildLearningDashboardSnapshot({
    learnerId,
    profiles,
    answerRecords,
    evidenceRecords,
    misconceptionRecords,
    resolveQuestion: (questionId) => contentRepository.getQuestion(questionId),
    resolveNode: (nodeId) => contentRepository.getNode(nodeId),
    resolveMisconceptionName: misconceptionName,
    recommendation,
    activityEndDate: fallbackActivityEnd,
  }), [answerRecords, evidenceRecords, fallbackActivityEnd, learnerId, misconceptionRecords, profiles, recommendation]);
  const recommendationAction = dashboard.recommendation
    ? actionForState(deriveLearningStateFromEvidence(dashboard.recommendation.pointId, learnerId, evidenceRecords))
    : 'study';
  const picoContext = useMemo(() => ({ key: 'progress:overview', route: location.pathname, pageType: 'progress' as const, title: '我的学习' }), [location.pathname]);
  usePicoPageContext(picoContext);
  const insightSignature = buildInsightSignature({
    learnerId,
    answered: dashboard.totals.answered,
    correct: dashboard.totals.correct,
    openMisconceptions: dashboard.totals.openMisconceptions,
    recommendationPointId: dashboard.recommendation?.pointId,
  });
  const visibleInsight = insightState?.signature === insightSignature ? insightState.result : cachedInsight(insightSignature);
  const generateInsight = async () => {
    if (insightBusy || Date.now() < insightCooldownUntil) return;
    const cached = cachedInsight(insightSignature);
    if (cached) {
      setInsightState({ signature: insightSignature, result: cached });
      return;
    }
    setInsightBusy(true);
    const result = await sendChat({ mode: 'insight', baseContext: learnerContext.base, contextBlocks: selectInsightContextBlocks(learnerContext) });
    cacheInsight(insightSignature, result);
    setInsightState({ signature: insightSignature, result });
    setInsightBusy(false);
    const until = Date.now() + AI_SUBMISSION_COOLDOWN_MS;
    setInsightCooldownUntil(until);
    window.setTimeout(() => setInsightCooldownUntil((current) => current === until ? 0 : current), AI_SUBMISSION_COOLDOWN_MS);
  };
  const enter = (index: number) => ({
    initial: reducedMotion ? false as const : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reducedMotion ? 0 : MOTION.duration.content, delay: reducedMotion ? 0 : index * 0.04, ease: MOTION.ease.out },
  });

  return <div className="page progress-page">
    <WorkspaceHeader title="我的学习" />
    <main className="learning-dashboard">
      <motion.header className="learning-dashboard__profile" {...enter(0)}>
        <div>
          <h1>{dashboard.profile.name}</h1>
          <p><span>{dashboard.profile.major}</span><span>{dashboard.profile.identity}</span><span>目标：{dashboard.profile.goal}</span></p>
        </div>
        <div className="learning-dashboard__profile-actions">
          <span className="demo-badge">演示数据</span>
          <ProfileEditorDrawer
            profile={dashboard.profile}
            open={profileEditorOpen}
            onOpen={() => setProfileEditorOpen(true)}
            onClose={() => setProfileEditorOpen(false)}
            onSave={(patch) => updateProfile(learnerId, patch)}
            onRestore={() => resetProfileOverride(learnerId)}
          />
          <LearningRecordDrawer records={dashboard.learningRecords} open={drawerOpen} onOpen={() => setDrawerOpen(true)} onClose={() => setDrawerOpen(false)} />
        </div>
      </motion.header>
      {storageError && <p className="lesson-save-error learning-dashboard__error" role="alert">{storageError}</p>}

      <div className="learning-dashboard__grid">
        <motion.section className="learning-dashboard__panel learning-dashboard__overall" aria-labelledby="overall-performance-title" {...enter(1)}>
          <h2 id="overall-performance-title" className="learning-dashboard__kicker">整体表现</h2>
          <div className="learning-dashboard__accuracy" aria-label={`整体正确率 ${dashboard.totals.accuracy === null ? '暂无' : `${percent(dashboard.totals.accuracy)}%`}`}>
            {percent(dashboard.totals.accuracy)}{dashboard.totals.accuracy !== null && <span>%</span>}
          </div>
          <p className="learning-dashboard__accuracy-label">整体正确率</p>
          <dl className="learning-dashboard__metric-matrix">
            <div><dt>作答</dt><dd>{dashboard.totals.answered}</dd></div>
            <div><dt>正确</dt><dd>{dashboard.totals.correct}</dd></div>
            <div><dt>错误</dt><dd>{dashboard.totals.incorrect}</dd></div>
            <div><dt>活跃天数</dt><dd>{dashboard.totals.activeDays}</dd></div>
            <div><dt>最长连续学习</dt><dd>{dashboard.totals.longestStreak}</dd></div>
            <div><dt>涉及知识点</dt><dd>{dashboard.totals.touchedPoints}</dd></div>
          </dl>
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__domains" aria-labelledby="domain-performance-title" {...enter(2)}>
          <div className="learning-dashboard__section-heading">
            <h2 id="domain-performance-title" className="learning-dashboard__kicker">方向表现</h2>
            <span>{dashboard.totals.answered} 题</span>
          </div>
          <div className="learning-dashboard__domain-list">
            {dashboard.branchStats.map((branch, index) => <article key={branch.branchId} className="learning-dashboard__domain">
              <div><strong>{branch.name}</strong><span>{branch.answered} 题 · {branch.touchedPoints} 个知识点</span><b>{percent(branch.accuracy)}{branch.accuracy !== null && '%'}</b></div>
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
            <h2 id="learning-space-title" className="learning-dashboard__kicker">学习空间</h2>
          </div>
          <LearningOverviewScene />
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__activity" aria-labelledby="learning-activity-title" {...enter(4)}>
          <div className="learning-dashboard__section-heading learning-dashboard__activity-heading">
            <h2 id="learning-activity-title" className="learning-dashboard__kicker">学习活动</h2>
            <p><span><b>{dashboard.totals.activeDays}</b> 个活跃日</span><span>最长连续 <b>{dashboard.totals.longestStreak}</b> 天</span></p>
          </div>
          <LearningActivityHeatmap activity={dashboard.activity} range={dashboard.activityRange} />
        </motion.section>

        <motion.section className="learning-dashboard__panel learning-dashboard__attention" aria-labelledby="needs-attention-title" {...enter(5)}>
          <div className="learning-dashboard__section-heading">
            <h2 id="needs-attention-title" className="learning-dashboard__kicker">需要关注</h2>
            <span>{dashboard.totals.openMisconceptions} 待处理</span>
          </div>
          <div className="learning-dashboard__attention-list">
            {dashboard.attention.length ? dashboard.attention.map((item) => <Link key={item.id} to={actionPath(item.nodeId, 'teach')}>
              <i aria-hidden="true" /><span><strong>{item.name}</strong><small>{item.nodeName}</small></span><b>{item.occurrences} 次</b>
            </Link>) : <p>当前没有待处理误区。</p>}
          </div>
          <div className="learning-dashboard__next">
            <span className="learning-dashboard__kicker">下一步</span>
            {dashboard.recommendation ? <>
              <strong><Link className="learning-dashboard__next-point" to={actionPath(dashboard.recommendation.pointId, 'study')}>{dashboard.recommendation.pointName}</Link></strong>
              <p>{dashboard.recommendation.reasons[0]}</p>
              <Link className="learning-dashboard__cta" to={actionPath(dashboard.recommendation.pointId, recommendationAction)}>
                {recommendationAction === 'teach' ? '带我巩固' : recommendationAction === 'verify' ? '再测一次' : '从这里继续'} <ArrowRight size={16} />
              </Link>
            </> : <>
              <strong>选择新的方向</strong><p>当前范围已完成独立验证。</p>
              <Link className="learning-dashboard__cta" to={ROUTES.library}>打开知识库 <ArrowRight size={16} /></Link>
            </>}
            <button className="learning-dashboard__insight-trigger" type="button" disabled={insightBusy || Date.now() < insightCooldownUntil} onClick={generateInsight}>{insightBusy ? '正在生成…' : '生成学习洞察'}</button>
            {visibleInsight && <div className="learning-dashboard__insight" aria-live="polite"><p>{visibleInsight.text}</p>{visibleInsight.source === 'mock' && <small>演示回复</small>}</div>}
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
