import { TransitionLink as Link } from '../../../app/pageNavigation';
import { ArrowRight } from '@phosphor-icons/react';
import type { TeachingRecommendation, ReviewItem } from '../../teaching/teachingPlan';

/** 下一轮教学安排（蓝图 §13 底部）：当前主推荐 + 待复教队列。 */
export function NextTeachingQueue({
  recommendation,
  reviews,
}: {
  recommendation: TeachingRecommendation | null;
  reviews: ReviewItem[];
}) {
  if (!recommendation) {
    return <p className="progress-empty">当前没有可安排的教学任务。</p>;
  }
  return (
    <div className="next-teaching">
      <div className="next-teaching__hero">
        <h3 className="next-teaching__name">{recommendation.nodeName}</h3>
        <p className="next-teaching__why">{recommendation.reason}</p>
        <Link className="text-button text-button--primary" to={`/teach/${recommendation.unitId}`}>
          开始教学
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
      {reviews.length > 0 && (
        <div className="next-teaching__queue">
          {reviews.map((item) => (
            <Link
              key={item.unitId}
              className="next-teaching__item"
              to={`/teach/${item.unitId}`}
              style={{ textDecoration: 'none' }}
            >
              <span>
                <span className="next-teaching__item-name">{item.nodeName}</span>
                <span className="next-teaching__item-why">{item.why}</span>
              </span>
              <span className="next-teaching__item-why">去复教 →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
