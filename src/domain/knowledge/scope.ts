import type { LearningScope, Question, TeachingUnit } from './types';
import { getPointsForTree, getPoint } from './selectors';

interface ContentRepository {
  getQuestionsForPoint(pointId: string): Question[];
  getTeachingUnitForPoint(pointId: string): TeachingUnit | undefined;
}

let _repo: ContentRepository | null = null;

export function initContentRepository(repo: ContentRepository) {
  _repo = repo;
}

function ensureRepo(): ContentRepository {
  if (!_repo) throw new Error('ContentRepository not initialized');
  return _repo;
}

export function getQuestionsForScope(scope: LearningScope): Question[] {
  const repo = ensureRepo();
  if (scope.kind === 'point') {
    return repo.getQuestionsForPoint(scope.pointId);
  }
  if (scope.kind === 'tree') {
    const points = getPointsForTree(scope.treeId);
    const ids = new Set(points.map((p) => p.id));
    return []; // Aggregated at runtime via repository
  }
  return [];
}

export function getTeachingUnitForScope(scope: LearningScope): TeachingUnit | undefined {
  if (scope.kind === 'point') {
    return ensureRepo().getTeachingUnitForPoint(scope.pointId);
  }
  return undefined;
}

export function scopeToString(scope: LearningScope): string {
  if (scope.kind === 'point') return '知识点';
  if (scope.kind === 'tree') return '知识树';
  return '知识库';
}

export function buildPracticePlan(
  scope: LearningScope,
  allQuestions: Question[],
): Question[] {
  if (scope.kind === 'point') {
    return allQuestions.filter((q) => q.pointIds.includes(scope.pointId));
  }
  if (scope.kind === 'tree') {
    const points = getPointsForTree(scope.treeId);
    const ids = new Set(points.map((p) => p.id));
    return allQuestions.filter((q) => q.pointIds.some((pid) => ids.has(pid)));
  }
  if (scope.kind === 'library') {
    return allQuestions;
  }
  return [];
}

export function deterministicOrderAndLimit(questions: Question[], _scope: LearningScope): Question[] {
  // Deterministic shuffle using node ids as seed source
  const seeded = [...questions].sort((a, b) => a.id.localeCompare(b.id));
  return seeded.slice(0, Math.min(seeded.length, 50));
}
