import { useUserStore } from '../../../store/userStore';
import { useProgressStore } from '../../../store/progressStore';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import { recommendNextTeaching, pendingReviews } from '../teachingPlan';
import { NextLessonHero } from '../components/NextLessonHero';
import { ReviewList } from '../components/ReviewList';
import { TeachingQueue } from '../components/TeachingQueue';
import { LessonGraphPreview } from '../components/LessonGraphPreview';
import { RecommendationReason } from '../components/RecommendationReason';
import '../teaching.css';

export function TeachingHomePage() {
  const learnerId = useUserStore((state) => state.activeProfileId);
  // 订阅进度变化：作答与掌握度回写后首页推荐会更新。
  useProgressStore((state) => state.answerRecords.length);
  useProgressStore((state) => state.remediationTasks.length);

  const recommendation = recommendNextTeaching(learnerId);
  const reviews = pendingReviews(learnerId);

  return (
    <div className="page">
      <div className="page__inner">
        <div className="teach-home__title-row">
          <h1 className="page-title">教学</h1>
          <p className="page-lead">
            根据你的目标和最近练习，系统已经安排下一节课。 <DemoDataBadge />
          </p>
          {recommendation && <RecommendationReason reason={recommendation.reason} />}
        </div>

        <div className="grid-12">
          {recommendation ? (
            <>
              <NextLessonHero recommendation={recommendation} />
              <ReviewList items={reviews} />
              <TeachingQueue />
              <LessonGraphPreview nodeId={recommendation.nodeId} />
            </>
          ) : (
            <section className="panel" style={{ gridColumn: 'span 12' }}>
              <div className="panel__body">
                <p className="page-lead">当前画像暂无可推荐的教学任务，先到刷题中心完成一次练习。</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
