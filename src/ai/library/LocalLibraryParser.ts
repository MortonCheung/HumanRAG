import { UNIVERSITY_TEMPLATES, UNIVERSITY_TEMPLATES_BY_ID } from '../../data/v6/catalogs/knowledgeBaseCatalog';
import { SeededRandom } from '../../data/v6/generators/seededRandom';

/**
 * 本地知识库解析模拟（蓝图 §18）：不读取真实文件，也不调用网络。
 * 根据粘贴文本 / 文件名关键词，从 48 个大学模板中匹配最接近的结构并返回草稿参数。
 */

export interface ParseResult {
  name: string;
  description: string;
  domain: string;
  matchedTemplateId: string | null;
  topicCount: number;
  nodeCount: number;
  /** 解析出的主题列表（供结构步骤展示）。 */
  topics: string[];
}

const DEFAULT_TOPICS = ['基本概念', '核心原理', '典型应用', '常见误区', '综合练习'];

/** 关键词 → 模板：先按模板名精确匹配，再按 domain 兜底。 */
function matchTemplate(text: string) {
  const normalized = text.trim();
  for (const template of UNIVERSITY_TEMPLATES) {
    if (normalized.includes(template.name)) return template;
  }
  const domainCandidates = UNIVERSITY_TEMPLATES.filter((template) =>
    template.domain.split('、').some((part) => normalized.includes(part)),
  );
  if (domainCandidates.length > 0) return domainCandidates[0];
  return null;
}

function topicNamesFor(template: { name: string; topicCount: number }): string[] {
  const rng = new SeededRandom(`topics-${template.name}`);
  const suffixes = ['基本概念', '核心原理', '推导与证明', '典型例题', '工程实践', '常见误区', '综合应用', '前沿扩展'];
  return Array.from({ length: template.topicCount }, (_, index) => {
    const suffix = suffixes[(index + template.name.length) % suffixes.length];
    return `${template.name} · ${suffix}`;
  }).slice(0, template.topicCount);
}

export function parseSource(input: { text?: string; fileName?: string }): ParseResult {
  const raw = `${input.text ?? ''} ${input.fileName ?? ''}`.trim();
  const template = matchTemplate(raw);

  if (template) {
    return {
      name: template.name,
      description: template.description,
      domain: template.domain,
      matchedTemplateId: template.id,
      topicCount: template.topicCount,
      nodeCount: template.nodeCount,
      topics: topicNamesFor(template),
    };
  }

  // 未匹配到模板：从文件名或文本首行生成一个基础结构。
  const baseName = (input.fileName ?? input.text ?? '未命名知识库').replace(/\.[^.]+$/, '').trim().slice(0, 24);
  const rng = new SeededRandom(`fallback-${baseName}`);
  const topicCount = rng.int(4, 8);
  return {
    name: baseName || '未命名知识库',
    description: '基于本地资料解析生成的自定义知识结构（演示数据）。',
    domain: '自定义',
    matchedTemplateId: null,
    topicCount,
    nodeCount: topicCount + 1,
    topics: topicNamesFor({ name: baseName, topicCount }),
  };
}

export function draftFromTemplate(templateId: string): ParseResult | null {
  const template = UNIVERSITY_TEMPLATES_BY_ID.get(templateId);
  if (!template) return null;
  return {
    name: template.name,
    description: template.description,
    domain: template.domain,
    matchedTemplateId: template.id,
    topicCount: template.topicCount,
    nodeCount: template.nodeCount,
    topics: topicNamesFor(template),
  };
}

/** 固定种子产生 420 - 760 ms 的解析延迟，避免每次完全一致。 */
export function simulatedLatency(seed: string): number {
  const rng = new SeededRandom(`latency-${seed}`);
  return 420 + rng.int(0, 340);
}
