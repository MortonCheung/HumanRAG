import { hashString, SeededRandom } from '../../data/v6/generators/seededRandom';
import type { CustomEdge, CustomNode } from '../../store/libraryStore';
import type { Question } from '../../data/v6/schemas/questionSchema';
import type {
  TeachingContentBlock,
  TeachingStep,
  TeachingUnit,
} from '../../data/v6/schemas/teachingSchema';
import type { CustomContent } from '../../data/v6/schemas/customContentSchema';

/**
 * 自定义知识库内容生成（蓝图 §11.2 / §14.2）：从解析出的主题确定性生成节点布局、
 * 初始关系、完整教学单元、教学步骤与题目。全站不使用 Math.random，同一输入产出相同结构。
 */

function nodeId(seed: string): string {
  return `cnode-${hashString(seed).toString(36).slice(0, 8)}`;
}

function edgeId(seed: string): string {
  return `cedge-${hashString(seed).toString(36).slice(0, 8)}`;
}

/** 从主题列表生成「1 个课程根节点 + N 个主题节点」的确定性圆形布局。 */
export function buildNodesFromTopics(name: string, topics: string[]): CustomNode[] {
  const rng = new SeededRandom(`custom-layout-${name}`);
  const root: CustomNode = {
    id: nodeId(`${name}:root`),
    name,
    kind: 'course',
    description: `「${name}」的知识结构根节点。`,
    x: 0,
    y: 0,
    z: 0,
    position: [0, 8, 0],
  };
  const nodes: CustomNode[] = [root];

  topics.forEach((topic, index) => {
    const angle = (index / Math.max(topics.length, 1)) * Math.PI * 2;
    const radius = 5 + (index % 3);
    const x = Number((Math.cos(angle) * radius + rng.float() * 1.6 - 0.8).toFixed(2));
    const z = Number((Math.sin(angle) * radius + rng.float() * 1.6 - 0.8).toFixed(2));
    nodes.push({
      id: nodeId(`${name}:${topic}:${index}`),
      name: topic,
      kind: 'topic',
      description: `「${name}」的主题：${topic}。`,
      x,
      y: 2,
      z,
      position: [x, 2, z],
    });
  });

  return nodes;
}

/** 根节点到每个主题建立一条 hierarchy 边，作为初始关系结构。 */
export function buildInitialEdges(nodes: CustomNode[]): CustomEdge[] {
  const root = nodes[0];
  if (!root) return [];
  return nodes.slice(1).map((node, index) => ({
    id: edgeId(`${root.id}:${node.id}:${index}`),
    source: root.id,
    target: node.id,
    relationType: 'hierarchy' as const,
  }));
}

const STEP_SUFFIXES = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;

type QuestionRole = 'diag' | 'guided' | 'check' | 'remediation';

/** 蓝图 §9.4：每个非课程节点的题量分布（诊断 3、引导 4、独立 3、补救 2）。 */
const ROLE_COUNTS: Record<QuestionRole, number> = {
  diag: 3,
  guided: 4,
  check: 3,
  remediation: 2,
};

function unitIdOf(nodeId: string): string {
  return `tu-${nodeId}`;
}

function stepIdOf(nodeId: string, index: number): string {
  return `tu-${nodeId}-${STEP_SUFFIXES[index]}`;
}

function questionIdOf(nodeId: string, role: QuestionRole, index: number): string {
  return `q-${nodeId}-${role}-${index}`;
}

function questionIdsForRole(nodeId: string, role: QuestionRole): string[] {
  return Array.from({ length: ROLE_COUNTS[role] }, (_, index) => questionIdOf(nodeId, role, index));
}

function difficultyOf(node: CustomNode): TeachingUnit['difficulty'] {
  switch (node.difficulty) {
    case '基础':
      return 2;
    case '进阶':
      return 3;
    case '挑战':
      return 4;
    default:
      return 2;
  }
}

/** 每个节点至少 3 条误区（TeachingUnitSchema 要求 misconceptionIds 不少于 3）。 */
function misconceptionItems(node: CustomNode): string[] {
  const fallback = [
    `把「${node.name}」与相邻主题混淆，忽略其概念边界。`,
    `只记住「${node.name}」的结论，不理解其成立前提。`,
    `低估「${node.name}」在真实场景中的应用价值。`,
  ];
  return [...(node.misconceptions ?? []), ...fallback].slice(0, 3);
}

function misconceptionIdsOf(node: CustomNode): string[] {
  return misconceptionItems(node).map((_, index) => `misc-${node.id}-${index + 1}`);
}

function buildChoiceQuestion(node: CustomNode, role: QuestionRole, index: number): Question {
  const id = questionIdOf(node.id, role, index);
  const stem =
    role === 'diag'
      ? `开始学习「${node.name}」前，先判断下列哪项理解正确？`
      : role === 'guided'
        ? `在提示下判断：关于「${node.name}」，下列说法正确的是？`
        : role === 'remediation'
          ? `针对「${node.name}」的常见误区，判断下列哪项理解正确？`
          : `独立判断：关于「${node.name}」，哪项表述成立？`;
  return {
    id,
    blueprintId: `qbp-${node.id}-${role}`,
    variantSeed: index,
    nodeIds: [node.id],
    type: 'single-choice',
    difficulty: difficultyOf(node),
    stem,
    options: [
      { id: 'a', text: `正确理解「${node.name}」的核心定义、边界条件与适用场景。` },
      { id: 'b', text: `「${node.name}」与相邻主题可以混用，无需区分边界。` },
      { id: 'c', text: `「${node.name}」只在考试中出现，没有实际应用价值。` },
      { id: 'd', text: `「${node.name}」的结论可以直接套用，无需检查前提条件。` },
    ],
    answer: { kind: 'choice', optionIds: ['a'] },
    explanation: `「${node.name}」需要同时明确其定义、边界条件与适用场景，选项 a 是正确理解。`,
    misconceptionByAnswer: {
      b: '混淆了相邻主题的边界',
      c: '低估了其应用价值',
      d: '忽略了成立的前提条件',
    },
    remediationUnitId: unitIdOf(node.id),
    sourceLabel: `自定义 · ${node.name}`,
  };
}

function buildQuestionsForNode(node: CustomNode): Question[] {
  const roles: QuestionRole[] = ['diag', 'guided', 'check', 'remediation'];
  return roles.flatMap((role) =>
    Array.from({ length: ROLE_COUNTS[role] }, (_, index) => buildChoiceQuestion(node, role, index)),
  );
}

function buildStepsForNode(node: CustomNode): TeachingStep[] {
  const unitId = unitIdOf(node.id);
  const diagnostic = questionIdsForRole(node.id, 'diag');
  const guided = questionIdsForRole(node.id, 'guided');
  const check = questionIdsForRole(node.id, 'check');
  const remediation = questionIdsForRole(node.id, 'remediation');
  const misconceptions = misconceptionItems(node);
  const s = (index: number) => stepIdOf(node.id, index);
  const checkBlocks = (ids: string[]): TeachingContentBlock[] =>
    ids.map((questionId) => ({ kind: 'check-question' as const, questionId }));

  return [
    {
      id: s(0),
      unitId,
      kind: 'objective',
      title: '学习目标',
      bodyBlocks: [
        { kind: 'paragraph', text: `掌握「${node.name}」的核心定义、适用边界与典型应用场景。` },
      ],
      nextRules: [{ condition: { kind: 'always' }, next: s(1) }],
    },
    {
      id: s(1),
      unitId,
      kind: 'diagnostic',
      title: '前置诊断',
      bodyBlocks: [
        { kind: 'paragraph', text: `先做三道题，确认你对「${node.name}」前置概念的理解，再决定从哪里开始讲解。` },
        ...checkBlocks(diagnostic),
      ],
      questionIds: diagnostic,
      nextRules: [
        { condition: { kind: 'diagnostic-below', threshold: 0.6 }, next: s(6) },
        { condition: { kind: 'always' }, next: s(2) },
      ],
    },
    {
      id: s(2),
      unitId,
      kind: 'explanation',
      title: '讲解：直觉、正式与应用',
      bodyBlocks: [
        { kind: 'paragraph', text: `直觉上，「${node.name}」回答的是「${node.description}」这一核心问题。` },
        { kind: 'paragraph', text: `正式定义上，「${node.name}」需要同时明确其边界条件与适用范围。` },
        { kind: 'paragraph', text: `应用上，「${node.name}」用于解决与主题相关的练习与真实问题。` },
      ],
      nextRules: [{ condition: { kind: 'always' }, next: s(3) }],
    },
    {
      id: s(3),
      unitId,
      kind: 'worked-example',
      title: '教师示范',
      bodyBlocks: [
        {
          kind: 'example',
          title: `示范：${node.name}`,
          prompt: `给定一个与「${node.name}」相关的题目，按标准顺序求解。`,
          walkthrough: ['先识别条件与目标。', '再套用核心定义或方法。', '最后验证结果是否满足边界条件。'],
        },
      ],
      nextRules: [{ condition: { kind: 'always' }, next: s(4) }],
    },
    {
      id: s(4),
      unitId,
      kind: 'guided-practice',
      title: '引导练习',
      bodyBlocks: [
        { kind: 'paragraph', text: `在提示下完成三道练习，每道题答错时会指出具体错因。` },
        ...checkBlocks(guided),
      ],
      questionIds: guided,
      nextRules: [
        { condition: { kind: 'misconception-detected' }, next: s(6) },
        { condition: { kind: 'always' }, next: s(5) },
      ],
    },
    {
      id: s(5),
      unitId,
      kind: 'independent-check',
      title: '独立检查',
      bodyBlocks: [
        { kind: 'paragraph', text: `无提示独立完成三道题，检验是否真正掌握「${node.name}」。` },
        ...checkBlocks(check),
      ],
      questionIds: check,
      nextRules: [
        { condition: { kind: 'score-at-least', threshold: 0.8 }, next: s(7) },
        { condition: { kind: 'always' }, next: s(6) },
      ],
    },
    {
      id: s(6),
      unitId,
      kind: 'remediation',
      title: '纠错与复教',
      bodyBlocks: [
        { kind: 'paragraph', text: '检测到理解偏差，先对照下面的常见误区定位问题，再回看讲解，最后重新检查。' },
        { kind: 'list', title: '常见误区与纠正', items: misconceptions },
        { kind: 'paragraph', text: '完成两道补救题，确认误区已消除后再回到独立检查。' },
        ...checkBlocks(remediation),
      ],
      questionIds: remediation,
      nextRules: [{ condition: { kind: 'always' }, next: s(5) }],
    },
    {
      id: s(7),
      unitId,
      kind: 'summary',
      title: '总结与掌握确认',
      bodyBlocks: [
        { kind: 'paragraph', text: `本节完成对「${node.name}」的诊断、讲解、示范、练习、纠错与确认，掌握证据已写回知识图谱。` },
        {
          kind: 'list',
          title: '掌握标准',
          items: [
            '独立检查正确率不低于 80%。',
            '能说明该主题与相邻主题的边界。',
            '能在变式题中正确判断适用条件。',
          ],
        },
      ],
      nextRules: [{ condition: { kind: 'always' }, next: 'end' }],
    },
  ];
}

function buildUnitForNode(
  node: CustomNode,
  edges: CustomEdge[],
): { unit: TeachingUnit; steps: TeachingStep[]; questions: Question[] } {
  const steps = buildStepsForNode(node);
  const rng = new SeededRandom(`tu-${node.id}`);
  const prerequisiteNodeIds = edges
    .filter((edge) => edge.relationType === 'prerequisite' && edge.target === node.id)
    .map((edge) => edge.source);
  const estimatedMinutes = Math.round(
    Math.min(90, Math.max(8, node.estimatedMinutes ?? rng.int(12, 40))),
  );

  const unit: TeachingUnit = {
    id: unitIdOf(node.id),
    nodeId: node.id,
    title: `「${node.name}」教学单元`,
    objective: `掌握「${node.name}」的核心定义、适用边界与典型应用场景。`,
    prerequisiteNodeIds,
    stepIds: steps.map((step) => step.id),
    misconceptionIds: misconceptionIdsOf(node),
    diagnosticQuestionIds: questionIdsForRole(node.id, 'diag'),
    independentCheckQuestionIds: questionIdsForRole(node.id, 'check'),
    estimatedMinutes,
    difficulty: difficultyOf(node),
  };

  return { unit, steps, questions: buildQuestionsForNode(node) };
}

/** 为全部主题节点生成完整内容（蓝图 §14.2：教学单元、步骤、题目一体生成）。 */
export function buildCustomContent(nodes: CustomNode[], edges: CustomEdge[] = []): CustomContent {
  const teachingUnits: TeachingUnit[] = [];
  const teachingSteps: TeachingStep[] = [];
  const questions: Question[] = [];
  for (const node of nodes) {
    if (node.kind === 'course') continue;
    const result = buildUnitForNode(node, edges);
    teachingUnits.push(result.unit);
    teachingSteps.push(...result.steps);
    questions.push(...result.questions);
  }
  return { teachingUnits, teachingSteps, questions };
}

/** 为每个主题节点生成完整教学单元与步骤（供教学结构步骤使用）。 */
export function buildTeachingUnits(nodes: CustomNode[], edges: CustomEdge[] = []): { units: TeachingUnit[]; steps: TeachingStep[] } {
  const content = buildCustomContent(nodes, edges);
  return { units: content.teachingUnits, steps: content.teachingSteps };
}

/** 为每个主题节点生成完整题目（供题目生成步骤使用）。 */
export function buildQuestions(nodes: CustomNode[]): Question[] {
  return buildCustomContent(nodes).questions;
}
