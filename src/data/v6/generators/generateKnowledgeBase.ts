import { SeededRandom } from './seededRandom';
import { UNIVERSITY_TEMPLATES, UNIVERSITY_TEMPLATES_BY_ID } from '../catalogs/knowledgeBaseCatalog';
import type {
  KnowledgeBase,
  TemplateEdge,
  TemplateNode,
  UniversityTemplate,
} from '../schemas/knowledgeBaseSchema';
import { listQuestionIdsByBranch } from './generateQuestionVariants';

/**
 * 大学模板知识库按需物化：每个模板 48-180 个节点（1 个 course + 若干 topic），
 * 只有进入对应知识库详情时才调用 materializeUniversityLibrary。
 * 节点坐标系为确定性生成的二维布局，供知识库详情页与预览使用。
 */

const TOPIC_SUFFIXES = [
  '基本概念',
  '核心原理',
  '推导与证明',
  '典型例题',
  '工程实践',
  '常见误区',
  '综合应用',
  '前沿扩展',
  '历史脉络',
  '跨学科联系',
  '评估方法',
  '工具链',
];

const nodeCache = new Map<string, TemplateNode[]>();
const edgeCache = new Map<string, TemplateEdge[]>();

export function materializeTemplateNodes(template: UniversityTemplate): TemplateNode[] {
  const cached = nodeCache.get(template.id);
  if (cached) return cached;

  const rng = new SeededRandom(`univ-${template.id}:nodes`);
  const nodes: TemplateNode[] = [
    {
      id: `${template.id}-root`,
      templateId: template.id,
      name: template.name,
      kind: 'course',
      description: template.description,
      x: 0,
      y: 0,
    },
  ];

  const perTopic = Math.max(1, Math.floor(template.nodeCount / template.topicCount));
  let created = 1;
  for (let topicIndex = 1; topicIndex <= template.topicCount && created < template.nodeCount; topicIndex += 1) {
    for (let slot = 0; slot < perTopic && created < template.nodeCount; slot += 1) {
      const suffix = TOPIC_SUFFIXES[(topicIndex + slot) % TOPIC_SUFFIXES.length];
      const angle = (topicIndex / template.topicCount) * Math.PI * 2;
      const radius = 4 + (slot % 3) * 3;
      nodes.push({
        id: `${template.id}-node-${created}`,
        templateId: template.id,
        name: `主题${topicIndex} · ${suffix}`,
        kind: 'topic',
        description: `「${template.name}」主题 ${topicIndex} 的${suffix}，覆盖${template.domain}方向的核心内容。`,
        x: Number((Math.cos(angle) * radius + rng.float() * 2 - 1).toFixed(2)),
        y: Number((Math.sin(angle) * radius + rng.float() * 2 - 1).toFixed(2)),
      });
      created += 1;
    }
  }

  nodeCache.set(template.id, nodes);
  return nodes;
}

export function materializeTemplateEdges(template: UniversityTemplate): TemplateEdge[] {
  const cached = edgeCache.get(template.id);
  if (cached) return cached;

  const rng = new SeededRandom(`univ-${template.id}:edges`);
  const nodes = materializeTemplateNodes(template);
  const root = nodes[0];
  const topics = nodes.slice(1);
  const edges: TemplateEdge[] = [];

  // 每个主题节点挂到课程根节点，同主题内建立前置链，主题间补少量 related 边。
  topics.forEach((node, index) => {
    edges.push({
      id: `${template.id}-e-h-${index}`,
      templateId: template.id,
      source: root.id,
      target: node.id,
      relationType: 'hierarchy',
    });
  });

  const perTopic = Math.max(1, Math.floor(template.nodeCount / template.topicCount));
  topics.forEach((node, index) => {
    const nextInTopic = index + 1;
    const sameTopic = Math.floor(index / perTopic) === Math.floor(nextInTopic / perTopic);
    if (sameTopic && nextInTopic < topics.length) {
      edges.push({
        id: `${template.id}-e-p-${index}`,
        templateId: template.id,
        source: topics[index].id,
        target: topics[nextInTopic].id,
        relationType: 'prerequisite',
      });
    } else if (index > 0 && rng.bool()) {
      const peer = topics[rng.int(0, topics.length - 1)];
      if (peer.id !== node.id) {
        edges.push({
          id: `${template.id}-e-r-${index}`,
          templateId: template.id,
          source: node.id,
          target: peer.id,
          relationType: 'related',
        });
      }
    }
  });

  edgeCache.set(template.id, edges);
  return edges;
}

/** 进入知识库详情时物化：节点、边与关联题目 id 一次性组装（教学单元在批次五接入）。 */
export function materializeUniversityLibrary(templateId: string): KnowledgeBase | undefined {
  const template = UNIVERSITY_TEMPLATES_BY_ID.get(templateId);
  if (!template) return undefined;

  const nodes = materializeTemplateNodes(template);
  const edges = materializeTemplateEdges(template);
  const questionIds = listQuestionIdsByBranch('university').filter((id) =>
    id.startsWith(`qbp-${template.id}-`),
  );

  return {
    id: `lib-${template.id}`,
    name: template.name,
    description: template.description,
    domain: template.domain,
    ownerType: 'system',
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
    sourceIds: [`source-${template.id}`],
    teachingUnitIds: [],
    questionIds,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-08-29T00:00:00.000Z',
  };
}

export function universityTemplateSummaries(): Array<{
  id: string;
  name: string;
  domain: string;
  description: string;
  topicCount: number;
  nodeCount: number;
}> {
  return UNIVERSITY_TEMPLATES;
}
