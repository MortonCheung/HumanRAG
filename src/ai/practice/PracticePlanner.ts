import { knowledgeGraph } from '../../data/knowledgeGraph';
import { SeededRandom } from '../../data/v6/generators/seededRandom';
import { MOCK_PAPERS } from '../../data/v6/generators/generateQuestionVariants';
import { contentRepository } from '../../services/content/ContentRepository';
import { LEARNER_PROFILES } from '../../data/v6/catalogs/learnerProfileCatalog';
import { MISCONCEPTIONS } from '../../data/v6/catalogs/misconceptionCatalog';
import { useProgressStore } from '../../store/progressStore';
import { TREE_ID_TO_BRANCH } from '../../domain/knowledge/catalog';

/**
 * 刷题规划器（蓝图 §18）：把刷题入口（今日练习 / 按目标 / 按知识点 / 模拟试卷 / 错题复习）
 * 确定性展开为题目序列。会话 id 即参数编码，刷新后可重建，无需持久化题目列表。
 *
 * sessionId 约定：
 *   daily           今日练习（按薄弱节点 + 目标分支）
 *   node:<nodeId>   按知识点练习
 *   goal:<nodeId>   按目标练习（目标节点全部下游）
 *   tree:<treeId>   一棵知识树的综合练习
 *   library:<id>    当前知识库的综合练习
 *   paper:<paperId> 模拟试卷
 *   mistake         错题复习
 */

export type PracticeMode = 'daily' | 'node' | 'goal' | 'paper' | 'mistake';

export interface PracticePlan {
  id: string;
  mode: PracticeMode;
  title: string;
  description: string;
  sourceLabel: string;
  questionIds: string[];
  estimatedMinutes: number;
}

const MINUTES_PER_QUESTION = 1.4;

function learnerBranchId(learnerId: string) {
  return LEARNER_PROFILES.find((profile) => profile.id === learnerId)?.branchId ?? '408';
}

/** 掌握度薄弱节点（level <= 1），按置信升序。 */
export function weakNodes(learnerId: string, limit = 6): string[] {
  const branchId = learnerBranchId(learnerId);
  const states = useProgressStore.getState().masteryByNode;
  const branchNodes = new Set(knowledgeGraph.nodes.filter((node) => node.branchId === branchId).map((node) => node.id));
  return states
    .filter((state) => state.learnerId === learnerId && branchNodes.has(state.nodeId) && state.level <= 1)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, limit)
    .map((state) => state.nodeId);
}

/** 目标节点：当前 learner 分支下的 goal 类型节点。 */
export function goalNodesForBranch(branchId: string): string[] {
  return knowledgeGraph.nodes
    .filter((node) => node.type === 'goal' && node.branchId === branchId)
    .map((node) => node.id);
}

/** 目标节点全部下游知识点（hierarchy 展开一层）。 */
function downstreamNodeIds(goalNodeId: string): string[] {
  const result: string[] = [];
  for (const edge of knowledgeGraph.edges) {
    if (edge.relationType === 'hierarchy' && edge.source === goalNodeId) result.push(edge.target);
  }
  if (result.length === 0) {
    // 无直接下级时退回 goal 自身。
    result.push(goalNodeId);
  }
  return result;
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => contentRepository.getQuestion(id) !== undefined)));
}

function buildDailyPlan(learnerId: string): PracticePlan {
  const branchId = learnerBranchId(learnerId);
  const weak = weakNodes(learnerId, 6);
  const profile = LEARNER_PROFILES.find((entry) => entry.id === learnerId);

  const weakQuestionIds = dedupe(weak.flatMap((nodeId) => contentRepository.getQuestionsForNode(nodeId).map((question) => question.id)));
  const goals = goalNodesForBranch(branchId);
  const goalQuestionIds = dedupe(goals.flatMap((nodeId) => downstreamNodeIds(nodeId).flatMap((childId) => contentRepository.getQuestionsForNode(childId).map((question) => question.id))));

  const rng = new SeededRandom(`daily-${learnerId}`);
  const pickedWeak = rng.pickMany(weakQuestionIds, 8);
  const pickedGoal = rng.pickMany(goalQuestionIds, 12);
  const questionIds = dedupe([...pickedWeak, ...pickedGoal]).slice(0, 20);

  const weakNames = weak
    .slice(0, 3)
    .map((nodeId) => knowledgeGraph.nodes.find((node) => node.id === nodeId)?.name ?? nodeId);

  return {
    id: 'daily',
    mode: 'daily',
    title: '今日练习',
    description:
      weak.length > 0
        ? `针对薄弱知识点「${weakNames.join('、')}」安排 20 题。`
        : '结合目标分支知识点安排 20 题。',
    sourceLabel: profile ? `${profile.goal} · 每日练习` : '每日练习',
    questionIds,
    estimatedMinutes: Math.round(questionIds.length * MINUTES_PER_QUESTION),
  };
}

function buildNodePlan(nodeId: string): PracticePlan | null {
  const node = contentRepository.getNode(nodeId);
  if (!node) return null;
  const questionIds = dedupe(contentRepository.getQuestionsForNode(nodeId).map((question) => question.id)).slice(0, 12);
  if (questionIds.length === 0) return null;
  return {
    id: `node:${nodeId}`,
    mode: 'node',
    title: `练习「${node.name}」`,
    description: `围绕单个知识点进行 ${questionIds.length} 题聚焦练习。`,
    sourceLabel: `知识点 · ${node.name}`,
    questionIds,
    estimatedMinutes: Math.round(questionIds.length * MINUTES_PER_QUESTION),
  };
}

function buildGoalPlan(nodeId: string): PracticePlan | null {
  const node = knowledgeGraph.nodes.find((entry) => entry.id === nodeId);
  if (!node || node.type !== 'goal') return null;
  const children = downstreamNodeIds(nodeId);
  const questionIds = dedupe(children.flatMap((childId) => contentRepository.getQuestionsForNode(childId).map((question) => question.id))).slice(0, 20);
  if (questionIds.length === 0) return null;
  return {
    id: `goal:${nodeId}`,
    mode: 'goal',
    title: `目标练习：${node.name}`,
    description: `覆盖该目标下 ${children.length} 个知识点，共 ${questionIds.length} 题。`,
    sourceLabel: `目标 · ${node.name}`,
    questionIds,
    estimatedMinutes: Math.round(questionIds.length * MINUTES_PER_QUESTION),
  };
}

function buildTreePlan(treeId: string): PracticePlan | null {
  const branchId = TREE_ID_TO_BRANCH[treeId];
  if (!branchId) return null;
  const branchNodes = knowledgeGraph.nodes.filter((node) => node.branchId === branchId);
  const questionIds = dedupe(branchNodes.flatMap((node) => contentRepository.getQuestionsForNode(node.id).map((question) => question.id))).slice(0, 28);
  if (questionIds.length === 0) return null;
  const treeName = { '408': '考研408', ai: 'AI工程', game: '游戏开发', frontend: '前端开发' }[branchId];
  return {
    id: `tree:${treeId}`,
    mode: 'goal',
    title: `${treeName}综合练习`,
    description: `覆盖这棵知识树的主要知识点，共 ${questionIds.length} 题。`,
    sourceLabel: `知识树 · ${treeName}`,
    questionIds,
    estimatedMinutes: Math.round(questionIds.length * MINUTES_PER_QUESTION),
  };
}

function buildLibraryPlan(libraryId: string): PracticePlan | null {
  if (libraryId !== 'computer') return null;
  const questionIds = dedupe(knowledgeGraph.nodes.flatMap((node) => contentRepository.getQuestionsForNode(node.id).map((question) => question.id))).slice(0, 36);
  if (questionIds.length === 0) return null;
  return {
    id: `library:${libraryId}`,
    mode: 'goal',
    title: '计算机科学综合题库',
    description: `跨四个知识树抽取 ${questionIds.length} 道题，适合完整体验。`,
    sourceLabel: '知识库 · 计算机科学',
    questionIds,
    estimatedMinutes: Math.round(questionIds.length * MINUTES_PER_QUESTION),
  };
}

function buildPaperPlan(paperId: string): PracticePlan | null {
  const paper = MOCK_PAPERS.find((entry) => entry.id === paperId);
  if (!paper) return null;
  return {
    id: `paper:${paperId}`,
    mode: 'paper',
    title: paper.title,
    description: `全真模拟卷，共 ${paper.questionIds.length} 题。`,
    sourceLabel: '模拟试卷',
    questionIds: paper.questionIds,
    estimatedMinutes: paper.estimatedMinutes,
  };
}

function buildMistakePlan(learnerId: string): PracticePlan | null {
  const records = useProgressStore.getState().answerRecords.filter((record) => record.learnerId === learnerId);
  const wrongIds = dedupe(records.filter((record) => !record.correct).map((record) => record.questionId));
  if (wrongIds.length === 0) return null;
  const questionIds = wrongIds.slice(0, 20);
  return {
    id: 'mistake',
    mode: 'mistake',
    title: '错题复习',
    description: `重做最近 ${questionIds.length} 道错题，巩固易错点。`,
    sourceLabel: '错题复习',
    questionIds,
    estimatedMinutes: Math.round(questionIds.length * MINUTES_PER_QUESTION),
  };
}

export function planForSession(sessionId: string, learnerId: string): PracticePlan | null {
  if (sessionId === 'daily') return buildDailyPlan(learnerId);
  if (sessionId === 'mistake') return buildMistakePlan(learnerId);
  if (sessionId.startsWith('node:')) return buildNodePlan(sessionId.slice(5));
  if (sessionId.startsWith('goal:')) return buildGoalPlan(sessionId.slice(5));
  if (sessionId.startsWith('tree:')) return buildTreePlan(sessionId.slice(5));
  if (sessionId.startsWith('library:')) return buildLibraryPlan(sessionId.slice(8));
  if (sessionId.startsWith('paper:')) return buildPaperPlan(sessionId.slice(6));
  return null;
}

/** 错题复习可用的错题数（供首页队列展示）。 */
export function mistakeCount(learnerId: string): number {
  const records = useProgressStore.getState().answerRecords.filter((record) => record.learnerId === learnerId);
  return new Set(records.filter((record) => !record.correct).map((record) => record.questionId)).size;
}

/** 当前 learner 分支下的薄弱误区条目（供首页与错题复习展示）。 */
export function weakMisconceptions(learnerId: string, limit = 5): string[] {
  const branchId = learnerBranchId(learnerId);
  const records = useProgressStore.getState().misconceptionRecords.filter(
    (record) => record.learnerId === learnerId && record.status === 'open',
  );
  const branchMisconceptions = new Set(
    MISCONCEPTIONS.filter((entry) => entry.branchId === branchId).map((entry) => entry.id),
  );
  return records
    .filter((record) => branchMisconceptions.has(record.misconceptionId))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, limit)
    .map((record) => record.misconceptionId);
}
