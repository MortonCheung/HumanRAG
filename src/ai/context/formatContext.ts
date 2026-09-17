import type { ContextBlock, LearnerBaseContext } from './contracts';

const BASE_LIMIT = 2_000;
const BLOCK_LIMIT = 1_800;
const percent = (value: number | null) => value === null ? '暂无' : `${Math.round(value * 100)}%`;
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();
const limited = (value: string, limit: number) => value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;

export function formatBaseContext(context: LearnerBaseContext) {
  const recommendation = context.recommendation
    ? `\n\n[当前推荐]\n知识点：${oneLine(context.recommendation.pointName)}${context.recommendation.reason ? `\n理由：${oneLine(context.recommendation.reason)}` : ''}`
    : '';
  return limited(`[学习者背景]
姓名：${oneLine(context.profile.name)}
专业：${oneLine(context.profile.major)}
阶段：${oneLine(context.profile.identity)}
目标：${oneLine(context.profile.goal)}

[总体学习概览]
作答：${context.overall.answered}
正确率：${percent(context.overall.accuracy)}
活跃天数：${context.overall.activeDays}
最长连续学习：${context.overall.longestStreak}天
涉及知识点：${context.overall.touchedPoints}
待处理误区：${context.overall.openMisconceptions}

[主要薄弱点]
${context.weakPoints.length ? context.weakPoints.map((item) => `- ${oneLine(item)}`).join('\n') : '- 暂无'}${recommendation}`, BASE_LIMIT);
}

export function formatContextBlock(block: ContextBlock) {
  let text: string;
  switch (block.type) {
    case 'mistakes':
      text = `[错题与误区]\n${block.misconceptions.length ? block.misconceptions.map((item) => `- ${oneLine(item.name)}｜${oneLine(item.nodeName)}｜${item.occurrences}次｜${item.lastSeenAt}`).join('\n') : '- 暂无待处理误区'}\n\n[最近错题]\n${block.recentWrongAnswers.length ? block.recentWrongAnswers.map((item) => `- ${oneLine(item.nodeName)}｜${oneLine(item.stem)}｜${item.createdAt}`).join('\n') : '- 暂无'}`;
      break;
    case 'activity':
      text = `[学习活动]\n总活跃天数：${block.activeDays}\n最长连续：${block.longestStreak}天\n近14天：作答${block.recent14Days.answered}，正确${block.recent14Days.correct}，活跃${block.recent14Days.activeDays}天，正确率${percent(block.recent14Days.accuracy)}\n${block.activeDates.length ? block.activeDates.map((item) => `- ${item.date}｜${item.count}题｜${percent(item.accuracy)}`).join('\n') : '- 近14天暂无活动'}`;
      break;
    case 'branches':
      text = `[方向表现]\n${block.branches.map((item) => `- ${oneLine(item.name)}｜作答${item.answered}｜知识点${item.touchedPoints}｜正确率${percent(item.accuracy)}`).join('\n')}`;
      break;
    case 'recommendation':
      text = `[下一步建议]\n知识点：${oneLine(block.pointName)}\nID：${oneLine(block.pointId)}\n${block.reasons.map((reason) => `- ${oneLine(reason)}`).join('\n')}`;
      break;
    case 'recentLearning':
      text = `[最近学习]\n${block.items.length ? block.items.map((item) => `- ${item.date}｜${oneLine(item.nodeName)}｜${item.correct ? '正确' : '错误'}`).join('\n') : '- 暂无'}`;
      break;
  }
  return limited(text, BLOCK_LIMIT);
}
