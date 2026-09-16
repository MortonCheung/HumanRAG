import type { LearningActivityDay } from '../learningDashboard';

function shortDate(date: string) {
  return date.slice(5).replace('-', '.');
}

function description(day: LearningActivityDay) {
  if (!day.count) return `${shortDate(day.date)} · 无学习记录`;
  return `${shortDate(day.date)} · ${day.count} 次作答 · ${Math.round((day.accuracy ?? 0) * 100)}% 正确`;
}

export function LearningActivityHeatmap({ activity, range }: {
  activity: readonly LearningActivityDay[];
  range: { start: string; end: string };
}) {
  return <div className="learning-activity-visual">
    <div className="learning-activity-heatmap" role="img" aria-label={`${shortDate(range.start)} 至 ${shortDate(range.end)} 的每日学习活动`}>
      {activity.map((day) => <span
        key={day.date}
        className="learning-activity-cell"
        data-level={day.level}
        title={description(day)}
        aria-label={description(day)}
      />)}
      <span className="learning-activity-cell learning-activity-cell--placeholder" aria-hidden="true" />
    </div>
    <div className="learning-activity-range" aria-label="学习活动日期范围">
      <span>{shortDate(range.start)}</span><i aria-hidden="true" /><span>{shortDate(range.end)}</span>
    </div>
  </div>;
}
