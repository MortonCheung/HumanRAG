import type { PicoExplicitContext } from './picoTypes';

/**
 * 「问问 Pico」= 一次明确的 Contextual Ask：问题由 context 类型决定，保持简短，
 * 不把大段正文塞进输入框——正文留在 explicitContext 里随请求发送。
 */
export function defaultPromptForExplicitContext(context: PicoExplicitContext): string {
  if (context.type === 'knowledge') return `帮我理解「${context.title}」这个知识点。`;
  if (context.type === 'question') {
    return context.answerPolicy === 'review'
      ? '帮我分析这道题和我的作答，重点告诉我哪里理解错了。'
      : '给我一个提示，但先不要告诉我答案。';
  }
  return '请解释这一部分，并告诉我它和当前知识点的关系。';
}

/** 会话里只展示轻量引用（80–120 字截断），完整 context 仍随请求发送。 */
export function explicitContextExcerpt(context: PicoExplicitContext): string | undefined {
  const raw = context.type === 'content'
    ? context.content
    : context.type === 'question'
      ? context.stem
      : context.description;
  const text = raw?.trim();
  if (!text) return undefined;
  return text.length <= 100 ? text : `${text.slice(0, 100)}…`;
}
