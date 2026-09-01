import { knowledgeGraph } from '../../knowledgeGraph';
import type { BranchId, KnowledgeNode } from '../../../graph/types';
import type { MockPaper, Question, QuestionMaterial } from '../schemas/questionSchema';
import { VARIANT_COUNT_PER_BLUEPRINT } from '../schemas/questionSchema';
import { SeededRandom } from './seededRandom';
import { buildChoice, buildText, buildTrueFalse } from './questionBuilders';
import { QUESTION_BLUEPRINTS, BLUEPRINTS_BY_BRANCH } from '../catalogs/questionBlueprintCatalog';
import { MISCONCEPTIONS, DEEP_MISCONCEPTIONS } from '../catalogs/misconceptionCatalog';

export interface QuestionSummary {
  id: string;
  branchId: string;
  nodeIds: string[];
  type: Question['type'];
  difficulty: Question['difficulty'];
  sourceLabel: string;
}

/**
 * 题库实例生成器。
 * 题目总数 = 480 蓝图 × 8 变式 + 336 节点诊断题 + 160 误区补救题 = 4,336。
 * 变式题按需物化（getQuestion），索引只保存 id 与蓝图级摘要，保证首屏内存可控。
 */

const BRANCH_SOURCE_LABEL: Record<BranchId, string> = {
  '408': '408 · 前置诊断',
  ai: 'AI 工程 · 前置诊断',
  game: '游戏开发 · 前置诊断',
  frontend: '前端开发 · 前置诊断',
};

const BRANCH_NAME: Record<BranchId, string> = {
  '408': '考研408',
  ai: 'AI工程',
  game: '游戏开发',
  frontend: '前端开发',
};

function nodeName(id: string): string {
  return knowledgeGraph.nodes.find((node) => node.id === id)?.name ?? id;
}

function branchNodeNames(branchId: BranchId, exclude: Set<string>): string[] {
  return knowledgeGraph.nodes
    .filter((node) => node.branchId === branchId && !exclude.has(node.name))
    .map((node) => node.name);
}

/** 节点前置诊断题：336 道，每个节点一道，从图关系推导。 */
function buildDiagnosticQuestion(node: KnowledgeNode): Question {
  const id = `q-diag-${node.id}`;
  const rng = new SeededRandom(`${id}:v0`);

  const prerequisiteNames = knowledgeGraph.edges
    .filter((edge) => edge.relationType === 'prerequisite' && edge.target === node.id)
    .map((edge) => nodeName(edge.source));
  const childNames = knowledgeGraph.edges
    .filter((edge) => edge.relationType === 'hierarchy' && edge.source === node.id)
    .map((edge) => nodeName(edge.target));
  const practicedForNames = knowledgeGraph.edges
    .filter((edge) => edge.relationType === 'practice_for' && edge.source === node.id)
    .map((edge) => nodeName(edge.target));

  const sourceLabel = `${BRANCH_SOURCE_LABEL[node.branchId]} · ${node.name}`;

  if (prerequisiteNames.length > 0) {
    const correct = prerequisiteNames[0];
    const wrong = rng.pickMany(branchNodeNames(node.branchId, new Set([correct, node.name])), 3);
    return finalizeQuestion(id, 'qbp-diagnostic', 0, [node.id], 'single-choice', 2, buildChoice({
      rng,
      stem: `开始学习「${node.name}」之前，最应先掌握下列哪项内容？`,
      correct,
      wrong: wrong.map((name) => ({ text: name, misconception: `「${name}」与「${node.name}」不构成直接前置关系。` })),
      explanation: `「${correct}」是「${node.name}」的直接前置知识，先补齐它再进入新内容。`,
    }), sourceLabel, undefined);
  }

  if (practicedForNames.length > 0) {
    const correct = practicedForNames[0];
    const wrong = rng.pickMany(branchNodeNames(node.branchId, new Set([correct, node.name])), 3);
    return finalizeQuestion(id, 'qbp-diagnostic', 0, [node.id], 'single-choice', 2, buildChoice({
      rng,
      stem: `练习「${node.name}」主要用来巩固哪个知识点？`,
      correct,
      wrong: wrong.map((name) => ({ text: name, misconception: `「${name}」不是「${node.name}」直接巩固的对象。` })),
      explanation: `「${node.name}」是围绕「${correct}」设计的形成性练习。`,
    }), sourceLabel, undefined);
  }

  if (childNames.length > 0) {
    const correct = childNames[0];
    const wrong = rng.pickMany(branchNodeNames(node.branchId, new Set([correct, node.name])), 3);
    return finalizeQuestion(id, 'qbp-diagnostic', 0, [node.id], 'single-choice', 2, buildChoice({
      rng,
      stem: `下列哪项内容直接属于「${node.name}」的范围？`,
      correct,
      wrong: wrong.map((name) => ({ text: name, misconception: `「${name}」不直接属于「${node.name}」的范围。` })),
      explanation: `「${node.name}」的直接下位内容包括：${childNames.join('、')}。`,
    }), sourceLabel, undefined);
  }

  return finalizeQuestion(id, 'qbp-diagnostic', 0, [node.id], 'fill-blank', 2, buildText({
    stem: `填空：「${node.name}」所属的知识分支是____。`,
    value: BRANCH_NAME[node.branchId],
    explanation: `「${node.name}」属于${BRANCH_NAME[node.branchId]}分支。`,
  }), sourceLabel, undefined);
}

const DIAGNOSTIC_QUESTIONS: Question[] = knowledgeGraph.nodes.map(buildDiagnosticQuestion);
const DIAGNOSTIC_BY_ID: ReadonlyMap<string, Question> = new Map(
  DIAGNOSTIC_QUESTIONS.map((question) => [question.id, question]),
);

/** 误区补救题：每条误区 2 道 + 前 32 条深度误区各 1 道，共 160 道。 */
function buildRemediationQuestions(): Question[] {
  const questions: Question[] = [];
  const extraDeep = new Set(DEEP_MISCONCEPTIONS.slice(0, 32).map((entry) => entry.id));

  for (const entry of MISCONCEPTIONS) {
    const baseRng = new SeededRandom(`q-rem-${entry.id}:meta`);
    const branchPeers = MISCONCEPTIONS.filter(
      (candidate) => candidate.branchId === entry.branchId && candidate.id !== entry.id,
    );
    const nodeIds = entry.relatedNodeIds.length > 0 ? entry.relatedNodeIds : [];

    // 补救题一：判断题，直接呈现错误陈述。
    questions.push(
      finalizeQuestion(
        `q-rem-${entry.id}-1`,
        `qbp-rem-${entry.id}`,
        0,
        nodeIds,
        'true-false',
        2,
        buildTrueFalse({
          stem: `判断：${entry.statement}`,
          value: false,
          explanation: entry.correction,
          misconception: entry.name,
        }),
        `误区补救 · ${entry.name}`,
        nodeIds.length > 0 ? `tu-${nodeIds[0]}` : undefined,
      ),
    );

    // 补救题二：选择题，纠错后的正确理解。
    const peers = baseRng.pickMany(branchPeers, 2);
    questions.push(
      finalizeQuestion(
        `q-rem-${entry.id}-2`,
        `qbp-rem-${entry.id}`,
        1,
        nodeIds,
        'single-choice',
        3,
        buildChoice({
          rng: baseRng,
          stem: `针对误区「${entry.name}」，下列理解正确的是？`,
          correct: entry.correction,
          wrong: [
            { text: entry.statement, misconception: entry.name },
            ...peers.map((peer) => ({ text: peer.statement, misconception: peer.name })),
          ],
          explanation: `${entry.appeal}正确理解：${entry.correction}`,
        }),
        `误区补救 · ${entry.name}`,
        nodeIds.length > 0 ? `tu-${nodeIds[0]}` : undefined,
      ),
    );

    // 补救题三：仅前 32 条深度误区，用于演示路径的复教环节。
    if (extraDeep.has(entry.id)) {
      const rng3 = new SeededRandom(`q-rem-${entry.id}:3`);
      questions.push(
        finalizeQuestion(
          `q-rem-${entry.id}-3`,
          `qbp-rem-${entry.id}`,
          2,
          nodeIds,
          'single-choice',
          4,
          buildChoice({
            rng: rng3,
            stem: `复教确认：为什么「${entry.statement.slice(0, Math.min(entry.statement.length, 24))}…」这一说法有迷惑性？`,
            correct: entry.appeal,
            wrong: [
              { text: '它只在极少数情况下不成立。', misconception: '误区并非小概率例外，而是系统性的理解偏差。' },
              { text: '它是由教材编排顺序造成的。', misconception: '误区来源是概念混淆，不是编排问题。' },
              { text: '它只在初学者中出现。', misconception: '误区与熟练度无关，与概念边界有关。' },
            ],
            explanation: `${entry.appeal}因此需要回到定义边界重新判断。正确表述：${entry.correction}`,
          }),
          `误区补救 · ${entry.name}`,
          nodeIds.length > 0 ? `tu-${nodeIds[0]}` : undefined,
        ),
      );
    }
  }
  return questions;
}

const REMEDIATION_QUESTIONS: Question[] = buildRemediationQuestions();
const REMEDIATION_BY_ID: ReadonlyMap<string, Question> = new Map(
  REMEDIATION_QUESTIONS.map((question) => [question.id, question]),
);

function finalizeQuestion(
  id: string,
  blueprintId: string,
  variantSeed: number,
  nodeIds: string[],
  type: Question['type'],
  difficulty: Question['difficulty'],
  material: QuestionMaterial,
  sourceLabel: string,
  remediationUnitId?: string,
): Question {
  return {
    id,
    blueprintId,
    variantSeed,
    nodeIds,
    type,
    difficulty,
    stem: material.stem,
    options: material.options,
    answer: material.answer,
    explanation: material.explanation,
    misconceptionByAnswer: material.misconceptionByAnswer ?? {},
    remediationUnitId,
    sourceLabel,
  };
}

/** 蓝图变式题索引：id → 蓝图。只存引用，不物化题目内容。 */
const BLUEPRINT_BY_ID: ReadonlyMap<string, (typeof QUESTION_BLUEPRINTS)[number]> = new Map(
  QUESTION_BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint]),
);

export function variantQuestionId(blueprintId: string, variantSeed: number): string {
  return `${blueprintId}#${variantSeed}`;
}

/** 获取题目实例：变式题按需物化并缓存，诊断/补救题直接返回。 */
const variantCache = new Map<string, Question>();

export function getQuestion(id: string): Question | undefined {
  const cached = variantCache.get(id);
  if (cached) return cached;

  const diagnostic = DIAGNOSTIC_BY_ID.get(id);
  if (diagnostic) return diagnostic;
  const remediation = REMEDIATION_BY_ID.get(id);
  if (remediation) return remediation;

  const hashIndex = id.lastIndexOf('#');
  if (hashIndex <= 0) return undefined;
  const blueprintId = id.slice(0, hashIndex);
  const seed = Number.parseInt(id.slice(hashIndex + 1), 10);
  if (!Number.isInteger(seed) || seed < 0 || seed >= VARIANT_COUNT_PER_BLUEPRINT) return undefined;

  const blueprint = BLUEPRINT_BY_ID.get(blueprintId);
  if (!blueprint) return undefined;

  const material = blueprint.materialize(seed);
  const question = finalizeQuestion(
    id,
    blueprintId,
    seed,
    blueprint.nodeIds,
    blueprint.type,
    blueprint.difficulty,
    material,
    blueprint.sourceLabel,
    blueprint.remediationUnitId,
  );
  variantCache.set(id, question);
  return question;
}

export function getQuestions(ids: string[]): Question[] {
  return ids
    .map((id) => getQuestion(id))
    .filter((question): question is Question => question !== undefined);
}

/** 题目摘要：蓝图级信息，物化前即可用于列表与筛选。 */
export function getQuestionSummary(id: string): QuestionSummary | undefined {
  const diagnostic = DIAGNOSTIC_BY_ID.get(id);
  if (diagnostic) {
    return {
      id,
      branchId: diagnostic.sourceLabel.startsWith('408')
        ? '408'
        : diagnostic.sourceLabel.startsWith('AI')
          ? 'ai'
          : diagnostic.sourceLabel.startsWith('游戏')
            ? 'game'
            : 'frontend',
      nodeIds: diagnostic.nodeIds,
      type: diagnostic.type,
      difficulty: diagnostic.difficulty,
      sourceLabel: diagnostic.sourceLabel,
    };
  }
  const remediation = REMEDIATION_BY_ID.get(id);
  if (remediation) {
    return {
      id,
      branchId: remediation.sourceLabel.startsWith('408')
        ? '408'
        : remediation.sourceLabel.startsWith('AI')
          ? 'ai'
          : remediation.sourceLabel.startsWith('游戏')
            ? 'game'
            : 'frontend',
      nodeIds: remediation.nodeIds,
      type: remediation.type,
      difficulty: remediation.difficulty,
      sourceLabel: remediation.sourceLabel,
    };
  }

  const hashIndex = id.lastIndexOf('#');
  if (hashIndex <= 0) return undefined;
  const blueprint = BLUEPRINT_BY_ID.get(id.slice(0, hashIndex));
  if (!blueprint) return undefined;
  return {
    id,
    branchId: blueprint.branchId,
    nodeIds: blueprint.nodeIds,
    type: blueprint.type,
    difficulty: blueprint.difficulty,
    sourceLabel: blueprint.sourceLabel,
  };
}

function branchQuestionIds(branchId: BranchId | 'university'): string[] {
  const ids: string[] = [];
  for (const blueprint of BLUEPRINTS_BY_BRANCH[branchId]) {
    for (let seed = 0; seed < VARIANT_COUNT_PER_BLUEPRINT; seed += 1) {
      ids.push(variantQuestionId(blueprint.id, seed));
    }
  }
  if (branchId !== 'university') {
    ids.push(...DIAGNOSTIC_QUESTIONS.filter((question) => question.sourceLabel.startsWith(BRANCH_SOURCE_LABEL[branchId])).map((question) => question.id));
    ids.push(
      ...REMEDIATION_QUESTIONS.filter((question) => {
        const entry = MISCONCEPTIONS.find((candidate) => question.blueprintId === `qbp-rem-${candidate.id}`);
        return entry?.branchId === branchId;
      }).map((question) => question.id),
    );
  }
  return ids;
}

const BRANCH_INDEX: Record<BranchId | 'university', string[]> = {
  '408': branchQuestionIds('408'),
  ai: branchQuestionIds('ai'),
  game: branchQuestionIds('game'),
  frontend: branchQuestionIds('frontend'),
  university: branchQuestionIds('university'),
};

export function listQuestionIdsByBranch(branchId: BranchId | 'university'): string[] {
  return BRANCH_INDEX[branchId];
}

/** 挂在某个节点上的全部题目 id（诊断 + 该节点蓝图的变式 + 相关补救）。 */
export function questionIdsForNode(nodeId: string): string[] {
  const ids: string[] = [];
  const diagnostic = DIAGNOSTIC_BY_ID.get(`q-diag-${nodeId}`);
  if (diagnostic) ids.push(diagnostic.id);
  for (const blueprint of QUESTION_BLUEPRINTS) {
    if (blueprint.nodeIds.includes(nodeId)) {
      for (let seed = 0; seed < VARIANT_COUNT_PER_BLUEPRINT; seed += 1) {
        ids.push(variantQuestionId(blueprint.id, seed));
      }
    }
  }
  for (const question of REMEDIATION_QUESTIONS) {
    if (question.nodeIds.includes(nodeId)) ids.push(question.id);
  }
  return ids;
}

export const QUESTION_POOL_TOTAL =
  QUESTION_BLUEPRINTS.length * VARIANT_COUNT_PER_BLUEPRINT +
  DIAGNOSTIC_QUESTIONS.length +
  REMEDIATION_QUESTIONS.length;

/** 24 套模拟试卷：每套 40 题，从对应分支确定性抽取。 */
function buildMockPapers(): MockPaper[] {
  const papers: MockPaper[] = [];
  const branchOrder: BranchId[] = ['408', 'ai', 'game', 'frontend'];
  const paperNames = ['一', '二', '三', '四', '五', '六'];

  branchOrder.forEach((branchId, branchIndex) => {
    for (let index = 0; index < 6; index += 1) {
      const rng = new SeededRandom(`paper-${branchId}-${index}`);
      const pool = BRANCH_INDEX[branchId];
      const questionIds = rng.pickMany(pool, 40);
      papers.push({
        id: `paper-${branchId}-${index + 1}`,
        title: `${BRANCH_NAME[branchId]}全真模拟卷（${paperNames[index]}）`,
        branchId,
        questionIds,
        estimatedMinutes: 150,
      });
    }
  });
  return papers;
}

export const MOCK_PAPERS: MockPaper[] = buildMockPapers();

export const QUESTION_COUNTS = {
  blueprintVariants: QUESTION_BLUEPRINTS.length * VARIANT_COUNT_PER_BLUEPRINT,
  diagnostic: DIAGNOSTIC_QUESTIONS.length,
  remediation: REMEDIATION_QUESTIONS.length,
  total: QUESTION_POOL_TOTAL,
  papers: MOCK_PAPERS.length,
  paperPositions: MOCK_PAPERS.length * 40,
};
