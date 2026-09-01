import { knowledgeGraph } from '../../knowledgeGraph';
import type { KnowledgeNode } from '../../../graph/types';
import type { TeachingStep, TeachingUnit } from '../schemas/teachingSchema';
import { SeededRandom } from './seededRandom';
import {
  objectiveText,
  intuitionText,
  formalText,
  applicationText,
  diagnosticIntro,
  workedExampleIntro,
  guidedPracticeIntro,
  independentCheckIntro,
  summaryText,
  templateDiagram,
  templateWorkedExamples,
} from '../catalogs/teachingCatalog';
import { MISCONCEPTIONS } from '../catalogs/misconceptionCatalog';
import { DEEP_NODE_IDS } from '../handcrafted/deepNodes';
import { questionIdsForNode } from './generateQuestionVariants';

/**
 * 教学单元生成器：336 个（每个图谱节点一个），每个 8 步闭环：
 * 目标 → 前置诊断 → 讲解（先补前置，再讲直觉/正式/应用）→ 示范 → 引导练习 → 独立检查 → 补救 → 总结。
 * 深度演示节点在误区配置与总结标准上使用手写目录内容。
 */

const STEP_SUFFIXES = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;

function stepId(nodeId: string, index: number): string {
  return `tu-${nodeId}-${STEP_SUFFIXES[index]}`;
}

function prerequisiteIdsOf(nodeId: string): string[] {
  return knowledgeGraph.edges
    .filter((edge) => edge.relationType === 'prerequisite' && edge.target === nodeId)
    .map((edge) => edge.source);
}

/** 单元可用的题目池：诊断题 + 节点蓝图变式 + 相关补救题；目标/方向节点回退到分支补救题。 */
function questionPoolForNode(node: KnowledgeNode): { diagnostic: string[]; practice: string[] } {
  const all = questionIdsForNode(node.id);
  const practice = all.filter((id) => !id.startsWith('q-diag-'));
  if (practice.length < 7) {
    const branchRemediation = MISCONCEPTIONS.filter((entry) => entry.branchId === node.branchId).map(
      (entry) => `q-rem-${entry.id}-1`,
    );
    practice.push(...branchRemediation.filter((id) => !practice.includes(id)));
  }
  return {
    diagnostic: all.filter((id) => id.startsWith('q-diag-')),
    practice,
  };
}

function misconceptionsForNode(node: KnowledgeNode) {
  const related = MISCONCEPTIONS.filter(
    (entry) => entry.relatedNodeIds.includes(node.id) || entry.relatedNodeIds.includes(node.parentId ?? ''),
  );
  const branchFill = MISCONCEPTIONS.filter(
    (entry) => entry.branchId === node.branchId && !related.includes(entry),
  );
  return [...related, ...branchFill].slice(0, 3);
}

function difficultyForNode(node: KnowledgeNode): TeachingUnit['difficulty'] {
  switch (node.type) {
    case 'goal':
      return 1;
    case 'direction':
    case 'course':
    case 'skill':
      return 2;
    case 'knowledge':
      return 3;
    default:
      return 4;
  }
}

export interface UnitQuestionSlots {
  diagnostic: string[];
  guided: string[];
  check: string[];
}

export function unitQuestionSlots(node: KnowledgeNode): UnitQuestionSlots {
  const { diagnostic, practice } = questionPoolForNode(node);
  const fallback = [...diagnostic, ...practice];
  const diagnosticIds = [
    ...diagnostic,
    ...practice.filter((id) => !diagnostic.includes(id)),
  ].slice(0, 3);
  const guided = practice.slice(0, 4).length >= 4 ? practice.slice(0, 4) : [...practice, ...fallback].slice(0, 4);
  const check =
    practice.slice(4, 7).length >= 3
      ? practice.slice(4, 7)
      : [...practice.slice(4), ...fallback].slice(0, 3);
  return { diagnostic: diagnosticIds, guided, check };
}

export function buildTeachingSteps(node: KnowledgeNode): TeachingStep[] {
  const unitId = `tu-${node.id}`;
  const { diagnostic, guided, check } = unitQuestionSlots(node);
  const misconceptions = misconceptionsForNode(node);
  const isDeep = DEEP_NODE_IDS.has(node.id);

  return [
    {
      id: stepId(node.id, 0),
      unitId,
      kind: 'objective',
      title: '学习目标',
      bodyBlocks: [{ kind: 'paragraph', text: objectiveText(node) }],
      nextRules: [{ condition: { kind: 'always' }, next: stepId(node.id, 1) }],
    },
    {
      id: stepId(node.id, 1),
      unitId,
      kind: 'diagnostic',
      title: '前置诊断',
      bodyBlocks: [
        { kind: 'paragraph', text: diagnosticIntro(node) },
        ...diagnostic.map((questionId) => ({ kind: 'check-question' as const, questionId })),
      ],
      questionIds: diagnostic,
      nextRules: [
        // 弱诊断必须进入包含前置补充的正式讲解，不能复用独立检查的复教回路。
        { condition: { kind: 'diagnostic-below', threshold: 0.6 }, next: stepId(node.id, 2) },
        { condition: { kind: 'always' }, next: stepId(node.id, 2) },
      ],
    },
    {
      id: stepId(node.id, 2),
      unitId,
      kind: 'explanation',
      title: '讲解：直觉、正式与应用',
      bodyBlocks: [
        {
          kind: 'paragraph',
          text: '前置知识补充：先确认本节依赖对象的基本定义、适用边界与关键关系，再进入下面的正式讲解。',
        },
        { kind: 'paragraph', text: intuitionText(node) },
        {
          kind: 'key-contrast',
          title: '三种视角',
          items: [
            { label: '直觉', text: '它解决什么问题、代价是什么。' },
            { label: '正式', text: '定义、边界条件与适用范围。' },
            { label: '应用', text: '考试与工程场景中的典型出现方式。' },
          ],
        },
        { kind: 'paragraph', text: formalText(node) },
        { kind: 'paragraph', text: applicationText(node) },
        templateDiagram(node),
      ],
      nextRules: [{ condition: { kind: 'always' }, next: stepId(node.id, 3) }],
    },
    {
      id: stepId(node.id, 3),
      unitId,
      kind: 'worked-example',
      title: '教师示范',
      bodyBlocks: [
        { kind: 'paragraph', text: workedExampleIntro(node) },
        ...templateWorkedExamples(node).map((example) => ({
          kind: 'example' as const,
          title: example.title,
          prompt: example.prompt,
          walkthrough: example.walkthrough,
        })),
      ],
      nextRules: [{ condition: { kind: 'always' }, next: stepId(node.id, 4) }],
    },
    {
      id: stepId(node.id, 4),
      unitId,
      kind: 'guided-practice',
      title: '引导练习',
      bodyBlocks: [
        { kind: 'paragraph', text: guidedPracticeIntro(node) },
        ...guided.map((questionId) => ({ kind: 'check-question' as const, questionId })),
      ],
      questionIds: guided,
      nextRules: [
        { condition: { kind: 'misconception-detected' }, next: stepId(node.id, 6) },
        { condition: { kind: 'always' }, next: stepId(node.id, 5) },
      ],
    },
    {
      id: stepId(node.id, 5),
      unitId,
      kind: 'independent-check',
      title: '独立检查',
      bodyBlocks: [
        { kind: 'paragraph', text: independentCheckIntro(node) },
        ...check.map((questionId) => ({ kind: 'check-question' as const, questionId })),
      ],
      questionIds: check,
      nextRules: [
        { condition: { kind: 'score-at-least', threshold: 0.8 }, next: stepId(node.id, 7) },
        { condition: { kind: 'always' }, next: stepId(node.id, 6) },
      ],
    },
    {
      id: stepId(node.id, 6),
      unitId,
      kind: 'remediation',
      title: '纠错与复教',
      bodyBlocks: [
        {
          kind: 'paragraph',
          text: '检测到理解偏差，先对照下面的常见误区定位问题，再回看讲解中的对应视角，最后重新完成独立检查。',
        },
        {
          kind: 'list',
          title: '常见误区与纠正',
          items: misconceptions.map(
            (entry) => `${entry.name}：${entry.statement} 正确理解：${entry.correction}`,
          ),
        },
      ],
      nextRules: [{ condition: { kind: 'always' }, next: stepId(node.id, 5) }],
    },
    {
      id: stepId(node.id, 7),
      unitId,
      kind: 'summary',
      title: '总结与掌握确认',
      bodyBlocks: [
        { kind: 'paragraph', text: summaryText(node) },
        {
          kind: 'list',
          title: '掌握标准',
          items: [
            '独立检查正确率不低于 80%。',
            '能说出该知识与前置、后续知识的连接方式。',
            isDeep ? '能识别深度演示路径上的典型误区并给出纠正。' : '能在变式题中正确判断适用条件。',
          ],
        },
      ],
      nextRules: [{ condition: { kind: 'always' }, next: 'end' }],
    },
  ];
}

export function generateTeachingUnit(node: KnowledgeNode): { unit: TeachingUnit; steps: TeachingStep[] } {
  const rng = new SeededRandom(`tu-${node.id}`);
  const steps = buildTeachingSteps(node);
  const { diagnostic, check } = unitQuestionSlots(node);
  const misconceptions = misconceptionsForNode(node);

  const unit: TeachingUnit = {
    id: `tu-${node.id}`,
    nodeId: node.id,
    title: `「${node.name}」教学单元`,
    objective: objectiveText(node),
    prerequisiteNodeIds: prerequisiteIdsOf(node.id),
    stepIds: steps.map((step) => step.id),
    misconceptionIds: misconceptions.map((entry) => entry.id),
    diagnosticQuestionIds: diagnostic,
    independentCheckQuestionIds: check,
    estimatedMinutes: rng.int(12, 40),
    difficulty: difficultyForNode(node),
  };
  return { unit, steps };
}

const built = knowledgeGraph.nodes.map(generateTeachingUnit);

export const TEACHING_UNITS: TeachingUnit[] = built.map((entry) => entry.unit);
export const TEACHING_STEPS: TeachingStep[] = built.flatMap((entry) => entry.steps);

export const TEACHING_UNITS_BY_ID: ReadonlyMap<string, TeachingUnit> = new Map(
  TEACHING_UNITS.map((unit) => [unit.id, unit]),
);

export const TEACHING_UNITS_BY_NODE_ID: ReadonlyMap<string, TeachingUnit> = new Map(
  TEACHING_UNITS.map((unit) => [unit.nodeId, unit]),
);

export const TEACHING_STEPS_BY_ID: ReadonlyMap<string, TeachingStep> = new Map(
  TEACHING_STEPS.map((step) => [step.id, step]),
);

export function stepsOfUnit(unitId: string): TeachingStep[] {
  const unit = TEACHING_UNITS_BY_ID.get(unitId);
  if (!unit) return [];
  return unit.stepIds
    .map((stepId) => TEACHING_STEPS_BY_ID.get(stepId))
    .filter((step): step is TeachingStep => step !== undefined);
}

export const TEACHING_UNIT_COUNT = TEACHING_UNITS.length;
export const TEACHING_CONTENT_BLOCK_COUNT = TEACHING_STEPS.reduce(
  (total, step) => total + step.bodyBlocks.length,
  0,
);
