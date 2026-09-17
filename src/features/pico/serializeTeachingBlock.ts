import type { TeachingContentBlock } from '../../data/v6/schemas/teachingSchema';

const limit = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 1_200);

export function teachingBlockTitle(block: TeachingContentBlock) {
  if (block.kind === 'paragraph') return '当前讲解';
  if (block.kind === 'diagram') return block.caption;
  if (block.kind === 'check-question') return '当前检查题';
  return block.title;
}

export function serializeTeachingBlock(block: TeachingContentBlock) {
  switch (block.kind) {
    case 'paragraph': return limit(block.text);
    case 'key-contrast': return limit(`${block.title}。${block.items.map((item) => `${item.label}：${item.text}`).join('；')}`);
    case 'diagram': return limit(`${block.caption}。节点：${block.nodes.join(' → ')}`);
    case 'example': return limit(`${block.title}。${block.prompt}。${block.walkthrough.join('；')}`);
    case 'list': return limit(`${block.title}。${block.items.join('；')}`);
    case 'check-question': return limit(`检查题：${block.questionId}`);
  }
}
