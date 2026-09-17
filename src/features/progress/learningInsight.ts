import type { ChatResult } from '../../ai/chat/contracts';
import type { ContextBlock, LearnerContextBundle } from '../../ai/context/contracts';

const cache = new Map<string, ChatResult>();

export function buildInsightSignature(input: {
  learnerId: string;
  answered: number;
  correct: number;
  openMisconceptions: number;
  recommendationPointId?: string;
}) {
  return [input.learnerId, input.answered, input.correct, input.openMisconceptions, input.recommendationPointId ?? 'none'].join(':');
}

export function selectInsightContextBlocks(bundle: LearnerContextBundle): ContextBlock[] {
  const hasMistakes = bundle.blocks.mistakes.misconceptions.length > 0 || bundle.blocks.mistakes.recentWrongAnswers.length > 0;
  const blocks: ContextBlock[] = [hasMistakes ? bundle.blocks.mistakes : bundle.blocks.activity];
  if (bundle.blocks.recommendation) blocks.push(bundle.blocks.recommendation);
  return blocks.slice(0, 2);
}

export function cachedInsight(signature: string) { return cache.get(signature); }
export function cacheInsight(signature: string, result: ChatResult) { cache.set(signature, result); }
