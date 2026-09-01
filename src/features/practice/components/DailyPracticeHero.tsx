import { Link } from 'react-router-dom';
import { ArrowRight, Lightning } from '@phosphor-icons/react';
import type { PracticePlan } from '../../../ai/practice/PracticePlanner';

export function DailyPracticeHero({ plan }: { plan: PracticePlan }) {
  return (
    <section className="panel practice-hero" style={{ gridColumn: 'span 8' }}>
      <p className="panel-kicker">今日练习主入口</p>
      <div className="practice-hero__node">
        <h2 className="practice-hero__name">{plan.title}</h2>
        <span className="practice-hero__meta">
          {plan.questionIds.length} 题 · 预计 {plan.estimatedMinutes} 分钟
        </span>
      </div>
      <p className="practice-hero__plan">{plan.description}</p>
      <p className="practice-hero__plan" style={{ color: 'var(--it-text-faint)', fontSize: 12.5 }}>
        题目来源：{plan.sourceLabel}
      </p>
      <div className="practice-hero__actions">
        <Link className="text-button text-button--primary" to={`/practice/session/${plan.id}`}>
          <Lightning size={15} weight="regular" /> 开始练习 <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
