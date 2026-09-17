import type { ContextBlockId, TutorIntent, TutorRouteResult } from './contracts';

function includesAny(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word));
}

function inferIntent(blocks: readonly ContextBlockId[]): TutorIntent {
  if (blocks.includes('recommendation')) return 'planning';
  if (blocks.includes('mistakes')) return 'weakness';
  if (blocks.includes('branches')) return 'branch-analysis';
  if (blocks.includes('activity') && blocks.includes('recentLearning')) return 'learning-overview';
  if (blocks.includes('activity')) return 'activity';
  if (blocks.includes('recentLearning')) return 'recent-learning';
  return 'general';
}

/** Conservative, deterministic routing. Topic words alone never unlock learner data. */
export function routeTutorContext(raw: string): TutorRouteResult {
  const text = raw.trim().toLowerCase();
  const scores = new Map<ContextBlockId, number>();
  const add = (block: ContextBlockId, score: number) => scores.set(block, (scores.get(block) ?? 0) + score);
  const asksEvaluation = /(怎么样|好不好|差不差|表现|状态|进步|退步|效果)/.test(text);
  const branchEntity = /(408|前端|游戏开发|人工智能|ai方向|ai工程)/i.test(text);
  const branchIntent = /(方向|表现|正确率|学得|进度|比较|对比|哪个|更好|更差)/.test(text);
  const selfReference = includesAny(text, ['我', '我的', '学习记录', '作答', '正确率', '错题', '薄弱', '误区', '活跃', '连续', '进度', '下一步']);
  const scopedBranchQuestion = branchEntity && branchIntent;

  if (selfReference || scopedBranchQuestion) {
    if (includesAny(text, ['薄弱', '弱点', '错题', '错误', '误区', '不会', '不懂', '哪块差', '哪里学得不好', '学得不好'])) {
      add('mistakes', scopedBranchQuestion ? 9 : 8);
    }
    if (includesAny(text, ['活跃', '连续', '这周', '这几天', '学习状态', '坚持', '频率'])) {
      add('activity', 7);
    }
    if (includesAny(text, ['下一步', '接下来', '学什么', '怎么安排', '计划', '先学', '复习什么'])) {
      add('recommendation', 9);
      add('mistakes', 3);
    }
    if (includesAny(text, ['最近学', '刚学', '学了什么', '做了什么', '最近做'])) {
      add('recentLearning', 8);
      add('activity', asksEvaluation ? 9 : 3);
    }
    if (scopedBranchQuestion) add('branches', 8);
  }

  const blocks = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([block]) => block);

  return { intent: inferIntent(blocks), blocks, flags: { asksEvaluation } };
}
