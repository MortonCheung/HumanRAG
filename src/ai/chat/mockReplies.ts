import type { ChatRequest, ChatResult } from './contracts';
import type { ContextBlock } from '../context/contracts';

function findBlock<T extends ContextBlock['type']>(blocks: readonly ContextBlock[], type: T) {
  return blocks.find((block): block is Extract<ContextBlock, { type: T }> => block.type === type);
}

function tutorReply(request: Extract<ChatRequest, { mode: 'tutor' }>) {
  if (request.routing.intent === 'weakness') {
    const mistakes = findBlock(request.contextBlocks, 'mistakes');
    return mistakes?.misconceptions.length
      ? `从当前学习记录看，最值得先处理的是${mistakes.misconceptions.slice(0, 2).map((item) => `「${item.nodeName}」`).join('和')}。这些问题已经重复出现，建议先回到对应知识点确认概念边界，再用新题验证。`
      : '当前没有足够的薄弱项记录。可以先完成几次独立作答，再回来查看更可靠的判断。';
  }
  if (request.routing.intent === 'planning') {
    const recommendation = findBlock(request.contextBlocks, 'recommendation');
    return recommendation
      ? `下一步建议先学「${recommendation.pointName}」。${recommendation.reasons[0] ?? '完成学习后，再用一道新题独立验证。'}`
      : '当前没有可用的下一步推荐记录，可以先从知识库选择一个正在学习的方向。';
  }
  if (request.routing.intent === 'activity' || request.routing.intent === 'learning-overview') {
    const activity = findBlock(request.contextBlocks, 'activity');
    return activity
      ? `近 14 天你作答了 ${activity.recent14Days.answered} 题，活跃 ${activity.recent14Days.activeDays} 天。比起一次刷很多题，更建议保持短而连续的学习节奏。`
      : '当前没有足够的近期学习活动记录。';
  }
  if (request.routing.intent === 'branch-analysis') {
    const branches = findBlock(request.contextBlocks, 'branches');
    const ranked = branches?.branches.filter((item) => item.accuracy !== null).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    return ranked?.length
      ? `当前有记录的方向中，「${ranked[0].name}」正确率相对最高。方向之间作答量可能不同，建议同时参考涉及知识点数量。`
      : '当前还没有足够的方向作答记录可供比较。';
  }
  if (request.routing.intent === 'recent-learning') {
    const recent = findBlock(request.contextBlocks, 'recentLearning');
    return recent?.items.length ? `你最近接触了${recent.items.slice(0, 3).map((item) => `「${item.nodeName}」`).join('、')}。可以挑最近一次错答先复盘。` : '当前没有最近学习记录。';
  }
  return '这是本地演示回复。你可以继续描述想理解的概念；涉及个人学习表现时，我会只依据已有记录回答。';
}

export function buildMockReply(request: ChatRequest): ChatResult {
  if (request.mode === 'tutor') return { source: 'mock', text: tutorReply(request) };
  if (request.mode === 'insight') {
    const point = request.baseContext.recommendation?.pointName;
    const accuracy = request.baseContext.overall.accuracy;
    const summary = accuracy === null ? '当前作答还不足以形成稳定正确率' : `当前整体正确率约为 ${Math.round(accuracy * 100)}%`;
    return { source: 'mock', text: `${summary}。${point ? `建议下一步先处理「${point}」，完成后用新题独立验证。` : '建议先完成一次独立作答，再根据记录安排下一步。'}` };
  }
  const explicit = request.explicitContext;
  if (explicit?.type === 'question' && explicit.answerPolicy === 'hint-only') {
    return { source: 'mock', text: `先别急着选答案。围绕「${explicit.title}」，试着找出题干中的已知条件，再判断它考查的是哪条规则。` };
  }
  if (explicit?.type === 'question' && explicit.answerPolicy === 'review') {
    return { source: 'mock', text: `可以从你的作答与参考答案的第一个分歧点开始复盘「${explicit.title}」，先说明自己当时用了哪条判断规则。` };
  }
  const title = explicit?.title ?? request.pageContext.title;
  return { source: 'mock', text: `我们现在正在看「${title}」。你可以告诉我具体卡在哪一句、哪个步骤，或希望我用例子解释哪部分。` };
}
