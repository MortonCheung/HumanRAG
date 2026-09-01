import { knowledgeGraph } from '../../knowledgeGraph';
import type { KnowledgeNode, BranchId } from '../../../graph/types';
import type { QuestionBlueprint, QuestionType } from '../schemas/questionSchema';
import { SeededRandom } from '../generators/seededRandom';
import { buildChoice, buildTrueFalse, buildOrdering, buildText } from '../generators/questionBuilders';
import { DEEP_BLUEPRINT_DEFS } from '../handcrafted/judgeDemoQuestions';
import { MISCONCEPTIONS } from './misconceptionCatalog';
import { UNIVERSITY_TEMPLATES } from './knowledgeBaseCatalog';

/**
 * 题目蓝图总表：480 个。
 * - 28 个深度手写蓝图（评委演示路径）。
 * - 360 个计算机分支通用蓝图（模板稳定生成）。
 * - 92 个大学模板蓝图（进入对应知识库时物化）。
 * 每个蓝图 8 个固定种子变式，共 3,840 道变式题。
 */

export const BRANCH_BLUEPRINT_TOTALS: Record<BranchId, number> = {
  '408': 184,
  ai: 84,
  game: 60,
  frontend: 60,
};

export const UNIVERSITY_BLUEPRINT_TOTAL = 92;
export const BLUEPRINT_TOTAL =
  BRANCH_BLUEPRINT_TOTALS['408'] +
  BRANCH_BLUEPRINT_TOTALS.ai +
  BRANCH_BLUEPRINT_TOTALS.game +
  BRANCH_BLUEPRINT_TOTALS.frontend +
  UNIVERSITY_BLUEPRINT_TOTAL; // 480

const SOURCE_LABELS: Record<BranchId, string> = {
  '408': '408 · 计算机',
  ai: 'AI 工程',
  game: '游戏开发',
  frontend: '前端开发',
};

const QUESTION_TYPE_CYCLE: QuestionType[] = [
  'single-choice',
  'true-false',
  'fill-blank',
  'ordering',
  'short-answer',
];

function sourceLabelForNode(node: KnowledgeNode): string {
  return `${SOURCE_LABELS[node.branchId]} · ${node.name}`;
}

/** 分支内可出题的教学节点（目标与方向层不直接出题，只出现在诊断题中）。 */
function teachableNodes(branchId: BranchId): KnowledgeNode[] {
  return knowledgeGraph.nodes.filter(
    (node) =>
      node.branchId === branchId &&
      (node.type === 'course' || node.type === 'skill' || node.type === 'knowledge' || node.type === 'practice'),
  );
}

function branchMisconceptions(branchId: BranchId) {
  return MISCONCEPTIONS.filter((entry) => entry.branchId === branchId);
}

/**
 * 通用蓝图：基于节点元数据与分支误区目录模板化出题。
 * 一个节点可挂多个蓝图（蓝图索引尾缀 -1/-2/…），内容按蓝图序号轮换题型。
 */
function buildGenericBlueprint(node: KnowledgeNode, slot: number, slotCount: number): QuestionBlueprint {
  const id = `qbp-${node.id}-${slot + 1}`;
  const type = QUESTION_TYPE_CYCLE[(slot + node.name.length) % QUESTION_TYPE_CYCLE.length];
  const difficulty = (1 + ((node.name.length + slot * 2) % 5)) as 1 | 2 | 3 | 4 | 5;
  const misconceptions = branchMisconceptions(node.branchId);
  const rng = new SeededRandom(`${id}:meta`);

  return {
    id,
    branchId: node.branchId,
    nodeIds: [node.id],
    type,
    difficulty,
    sourceLabel: sourceLabelForNode(node),
    remediationUnitId: `tu-${node.id}`,
    materialize(variantSeed: number) {
      const r = new SeededRandom(`${id}:v${variantSeed}`);
      const variantIndex = variantSeed % 8;
      const focus = node.keywords[variantIndex % Math.max(node.keywords.length, 1)] ?? node.name;
      const content = node.recommendedContent[variantIndex % Math.max(node.recommendedContent.length, 1)] ?? `${node.name}核心概念`;
      const wrong = r.pickMany(misconceptions, 3);

      switch (type) {
        case 'single-choice': {
          return buildChoice({
            rng: r,
            stem: `关于「${node.name}」，下列说法正确的是哪一项？`,
            correct: `「${node.name}」的考查重点是${content}，需要结合${focus}判断适用条件。`,
            wrong: wrong.map((entry) => ({ text: entry.statement, misconception: entry.correction })),
            explanation: `「${node.name}」的定位：${node.description}`,
          });
        }
        case 'true-false': {
          const useWrong = variantIndex % 2 === 0;
          if (useWrong && wrong.length > 0) {
            const entry = wrong[variantIndex % wrong.length];
            return buildTrueFalse({
              stem: `判断：${entry.statement}`,
              value: false,
              explanation: entry.correction,
              misconception: entry.name,
            });
          }
          return buildTrueFalse({
            stem: `判断：${node.description}`,
            value: true,
            explanation: `该描述与「${node.name}」的标准定义一致，重点在${content}。`,
          });
        }
        case 'ordering': {
          const items = [
            `确认${focus}的定义与边界`,
            `分析${content}的典型场景`,
            `对比相邻方案的取舍`,
            `完成综合题并验证结论`,
          ];
          return buildOrdering({
            rng: r,
            stem: `学习「${node.name}」时，以下步骤的正确顺序是？`,
            items,
            explanation: `先确认定义，再分析场景、比较方案，最后通过综合题验证，是「${node.name}」的推荐学习顺序。`,
          });
        }
        case 'fill-blank': {
          return buildText({
            stem: `填空：「${node.name}」的核心关键词是____（提示：与${content}直接相关）。`,
            value: focus,
            explanation: `「${node.name}」围绕${focus}展开，该关键词直接对应${content}。`,
          });
        }
        default: {
          return buildText({
            stem: `用不超过三句话说明「${node.name}」解决什么问题、代价是什么，以及它和一个前置知识的关系。`,
            value: `${node.description}其核心关键词是${focus}。`,
            explanation: `作答应包含：问题定位、代价或限制、与前置知识的连接三点，均与${content}相关。`,
          });
        }
      }
    },
  };
}

function buildBranchBlueprints(branchId: BranchId): QuestionBlueprint[] {
  const total = BRANCH_BLUEPRINT_TOTALS[branchId];
  const deepDefs = DEEP_BLUEPRINT_DEFS.filter((def) => def.branchId === branchId);
  const genericTotal = total - deepDefs.length;
  const nodes = teachableNodes(branchId);

  const blueprints: QuestionBlueprint[] = deepDefs.map((def) => ({
    id: `qbp-deep-${def.nodeId}`,
    branchId: def.branchId,
    nodeIds: [def.nodeId],
    type: def.type,
    difficulty: def.difficulty,
    sourceLabel: def.sourceLabel,
    remediationUnitId: `tu-${def.nodeId}`,
    materialize: (variantSeed: number) => def.materialize(variantSeed),
  }));

  // 深度节点优先分配通用蓝图，剩余配额按节点顺序轮转。
  const deepNodeIds = new Set(deepDefs.map((def) => def.nodeId));
  const orderedNodes = [...nodes].sort((a, b) => {
    const aDeep = deepNodeIds.has(a.id) ? 0 : 1;
    const bDeep = deepNodeIds.has(b.id) ? 0 : 1;
    return aDeep - bDeep;
  });

  let assigned = 0;
  let guard = 0;
  while (assigned < genericTotal && guard < genericTotal * 4) {
    const node = orderedNodes[assigned % orderedNodes.length];
    const slot = Math.floor(assigned / orderedNodes.length);
    blueprints.push(buildGenericBlueprint(node, slot, orderedNodes.length));
    assigned += 1;
    guard += 1;
  }

  return blueprints;
}

/** 大学模板蓝图：挂在模板首个主题节点上，进入对应知识库时物化。 */
function buildUniversityBlueprints(): QuestionBlueprint[] {
  const blueprints: QuestionBlueprint[] = [];
  let created = 0;
  const perTemplate = Math.ceil(UNIVERSITY_BLUEPRINT_TOTAL / UNIVERSITY_TEMPLATES.length);
  for (const template of UNIVERSITY_TEMPLATES) {
    if (created >= UNIVERSITY_BLUEPRINT_TOTAL) break;
    const count = Math.min(perTemplate, UNIVERSITY_BLUEPRINT_TOTAL - created);
    for (let slot = 0; slot < count; slot += 1) {
      const id = `qbp-${template.id}-${slot + 1}`;
      const type = QUESTION_TYPE_CYCLE[(slot + template.name.length) % QUESTION_TYPE_CYCLE.length];
      blueprints.push({
        id,
        branchId: 'university',
        nodeIds: [`${template.id}-node-1`],
        type,
        difficulty: (1 + ((template.name.length + slot) % 5)) as 1 | 2 | 3 | 4 | 5,
        sourceLabel: `大学扩展 · ${template.name}`,
        materialize(variantSeed: number) {
          const r = new SeededRandom(`${id}:v${variantSeed}`);
          const topicIndex = variantSeed % template.topicCount + 1;
          if (type === 'true-false') {
            return buildTrueFalse({
              stem: `判断：「${template.name}」的第 ${topicIndex} 个主题主要讨论${template.description.slice(0, 18)}相关内容。`,
              value: true,
              explanation: `${template.name}共 ${template.topicCount} 个主题、${template.nodeCount} 个节点，该主题属于其核心内容。`,
            });
          }
          return buildChoice({
            rng: r,
            stem: `在「${template.name}」的第 ${topicIndex} 个主题中，最应优先掌握的内容是？`,
            correct: `${template.name}的核心概念、适用条件与典型推导过程。`,
            wrong: [
              { text: '直接记忆结论并套用到所有变式上。', misconception: '跳过条件判断，容易在变式题中出错。' },
              { text: '先刷题再补概念，遇到错题也不回看定义。', misconception: '缺乏概念支撑的刷题会固化错误理解。' },
              { text: '只关注公式推导，忽略它的工程或应用场景。', misconception: '割裂理论与应用，无法应对综合题。' },
            ],
            explanation: `${template.description}`,
          });
        },
      });
      created += 1;
    }
  }
  return blueprints;
}

export const QUESTION_BLUEPRINTS: QuestionBlueprint[] = [
  ...buildBranchBlueprints('408'),
  ...buildBranchBlueprints('ai'),
  ...buildBranchBlueprints('game'),
  ...buildBranchBlueprints('frontend'),
  ...buildUniversityBlueprints(),
];

export const BLUEPRINTS_BY_BRANCH: Record<BranchId | 'university', QuestionBlueprint[]> = {
  '408': QUESTION_BLUEPRINTS.filter((blueprint) => blueprint.branchId === '408'),
  ai: QUESTION_BLUEPRINTS.filter((blueprint) => blueprint.branchId === 'ai'),
  game: QUESTION_BLUEPRINTS.filter((blueprint) => blueprint.branchId === 'game'),
  frontend: QUESTION_BLUEPRINTS.filter((blueprint) => blueprint.branchId === 'frontend'),
  university: QUESTION_BLUEPRINTS.filter((blueprint) => blueprint.branchId === 'university'),
};
