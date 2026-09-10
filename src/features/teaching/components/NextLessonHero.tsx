import { TransitionLink as Link } from '../../../app/pageNavigation';
import { ArrowRight } from '@phosphor-icons/react';
import type { TeachingRecommendation } from '../teachingPlan';

export function NextLessonHero({ recommendation }: { recommendation: TeachingRecommendation }) {
  return (
    <section className="panel next-lesson" style={{ gridColumn: 'span 8' }}>
      <p className="panel-kicker">推荐教学任务</p>
      <div className="next-lesson__node">
        <h2 className="next-lesson__name">{recommendation.nodeName}</h2>
        <span className="next-lesson__meta">
          预计 {recommendation.estimatedMinutes} 分钟 · 先诊断，再讲解，再练习
        </span>
      </div>
      <p className="next-lesson__plan">
        本节按教学闭环执行：前置诊断决定起点，讲解分直觉、正式、应用三种视角，随后是教师示范、
        引导练习与独立检查；未达掌握标准会自动进入补救讲解。
      </p>
      <div className="next-lesson__actions">
        <Link className="text-button text-button--primary" to={`/teach/${recommendation.unitId}`}>
          继续教学
          <ArrowRight size={14} weight="bold" />
        </Link>
        <a className="text-button text-button--ghost" href="#teaching-reason">
          查看依据
        </a>
      </div>
    </section>
  );
}
