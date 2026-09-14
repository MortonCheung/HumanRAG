import { getRegistry } from '../../domain/knowledge/selectors';
import type { KnowledgePoint, KnowledgeRelation } from '../../domain/knowledge/types';

export interface GoalTreeDraft {
  name: string;
  description: string;
  pointIds: string[];
  /** 自然语言最直接命中的起点，Reveal 从这里出发。 */
  seedPointIds: string[];
  reasons: Record<string, string[]>;
}

export interface GoalQuery {
  original: string;
  goalTerms: string[];
  weakTerms: string[];
  interestTerms: string[];
  strongTerms: string[];
}

type QueryField = Exclude<keyof GoalQuery, 'original'>;

const CONTEXT_MARKERS: Array<{ field: QueryField; pattern: RegExp }> = [
  { field: 'weakTerms', pattern: /薄弱|不熟|不懂|不会|欠缺|困难|较弱|比较弱|需要巩固|基础弱/ },
  { field: 'strongTerms', pattern: /擅长|熟悉|掌握|还可以|比较好|基础好|强项/ },
  { field: 'interestTerms', pattern: /感兴趣|有兴趣|想了解|好奇|喜欢/ },
];

const FILLER_WORDS = [
  '我现在', '我准备', '我希望', '我想要', '我想', '我要', '也对', '对于', '关于', '相关',
  '比较', '基础', '方向', '内容', '知识', '学习', '一下', '一些', '目前', '现在', '可以', '准备',
];

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('zh-CN').trim();
}

function extractTerms(value: string): string[] {
  let clean = normalize(value);
  for (const marker of CONTEXT_MARKERS) clean = clean.replace(marker.pattern, ' ');
  for (const word of FILLER_WORDS) clean = clean.replaceAll(word, ' ');

  const terms: string[] = [];
  for (const token of clean.match(/[a-z][a-z0-9+#.]*(?:\s+[a-z][a-z0-9+#.]*)*|\d+|[\u3400-\u9fff]{2,}/g) ?? []) {
    const compact = token.replace(/\s+/g, '');
    if (/^[\u3400-\u9fff]+$/.test(compact) && compact.length > 6) {
      for (let size = 6; size >= 2; size -= 1) {
        for (let start = 0; start + size <= compact.length; start += 1) terms.push(compact.slice(start, start + size));
      }
    } else {
      terms.push(compact);
    }
  }
  return unique(terms.filter((term) => term.length >= 2 || /^\d+$/.test(term)));
}

export function parseGoalQuery(prompt: string): GoalQuery {
  const query: GoalQuery = { original: prompt.trim(), goalTerms: [], weakTerms: [], interestTerms: [], strongTerms: [] };
  for (const clause of prompt.split(/[，,。；;！？!?\n]+/).map((item) => item.trim()).filter(Boolean)) {
    const field = CONTEXT_MARKERS.find((marker) => marker.pattern.test(clause))?.field ?? 'goalTerms';
    query[field].push(...extractTerms(clause));
  }
  for (const field of ['goalTerms', 'weakTerms', 'interestTerms', 'strongTerms'] as const) query[field] = unique(query[field]);
  return query;
}

function searchableText(point: KnowledgePoint): { name: string; tags: string[]; all: string } {
  const name = normalize(point.name).replace(/\s+/g, '');
  const tags = point.tags.map((tag) => normalize(tag).replace(/\s+/g, ''));
  const all = normalize([
    point.name,
    point.description,
    ...point.tags,
    ...point.learningObjectives,
    ...point.recommendedContent,
  ].join(' ')).replace(/\s+/g, '');
  return { name, tags, all };
}

function termScore(point: KnowledgePoint, term: string, weights: [number, number, number]): number {
  const text = searchableText(point);
  if (text.name.includes(term)) return weights[0];
  if (text.tags.some((tag) => tag.includes(term))) return weights[1];
  if (text.all.includes(term)) return weights[2];
  return 0;
}

export function scorePoint(point: KnowledgePoint, query: GoalQuery): number {
  let score = 0;
  for (const term of query.goalTerms) score += termScore(point, term, [8, 5, 2]);
  for (const term of query.weakTerms) score += termScore(point, term, [3.5, 3.5, 3.5]);
  for (const term of query.interestTerms) score += termScore(point, term, [1.5, 1.5, 1.5]);
  for (const term of query.strongTerms) score += termScore(point, term, [0.5, 0.5, 0.5]);
  return score;
}

function scoreForField(point: KnowledgePoint, query: GoalQuery, field: QueryField): number {
  const weights: Record<QueryField, [number, number, number]> = {
    goalTerms: [8, 5, 2], weakTerms: [3.5, 3.5, 3.5], interestTerms: [1.5, 1.5, 1.5], strongTerms: [0.5, 0.5, 0.5],
  };
  return query[field].reduce((sum, term) => sum + termScore(point, term, weights[field]), 0);
}

function matchSpecificity(point: KnowledgePoint, terms: string[]): number {
  const text = searchableText(point);
  return terms.reduce((best, term) => {
    if (text.name.includes(term)) return Math.max(best, 3);
    if (text.tags.some((tag) => tag.includes(term))) return Math.max(best, 2);
    if (text.all.includes(term)) return Math.max(best, 1);
    return best;
  }, 0);
}

export function propagateScores(scores: Map<string, number>, relations: KnowledgeRelation[]): Map<string, number> {
  let current = new Map(scores);
  for (let pass = 0; pass < 3; pass += 1) {
    const next = new Map(current);
    const raise = (id: string, value: number) => next.set(id, Math.max(next.get(id) ?? 0, value));
    for (const relation of relations) {
      const source = current.get(relation.sourcePointId) ?? 0;
      const target = current.get(relation.targetPointId) ?? 0;
      if (relation.type === 'prerequisite') {
        raise(relation.sourcePointId, target * 0.72);
        raise(relation.targetPointId, source * 0.46);
      } else if (relation.type === 'hierarchy') {
        raise(relation.targetPointId, source * 0.66);
        raise(relation.sourcePointId, target * 0.52);
      } else if (relation.type === 'practice_for') {
        raise(relation.targetPointId, source * 0.58);
        raise(relation.sourcePointId, target * 0.32);
      } else {
        raise(relation.targetPointId, source * 0.3);
        raise(relation.sourcePointId, target * 0.3);
      }
    }
    current = next;
  }
  return current;
}

function buildNeighbors(relations: KnowledgeRelation[]): Map<string, string[]> {
  const neighbors = new Map<string, string[]>();
  const add = (from: string, to: string) => neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
  for (const relation of relations) {
    add(relation.sourcePointId, relation.targetPointId);
    add(relation.targetPointId, relation.sourcePointId);
  }
  for (const [id, entries] of neighbors) neighbors.set(id, unique(entries).sort());
  return neighbors;
}

function shortestPath(fromIds: Set<string>, targetId: string, neighbors: Map<string, string[]>): string[] | null {
  if (fromIds.has(targetId)) return [targetId];
  const queue = [...fromIds].sort();
  const previous = new Map<string, string | null>(queue.map((id) => [id, null]));
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const next of neighbors.get(current) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === targetId) {
        const path = [next];
        let cursor = current;
        while (!fromIds.has(cursor)) {
          path.push(cursor);
          cursor = previous.get(cursor)!;
        }
        path.push(cursor);
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

function explainMatch(point: KnowledgePoint, query: GoalQuery): string[] {
  const reasons: string[] = [];
  if (scoreForField(point, query, 'goalTerms') > 0) reasons.push('与你描述的主要目标直接相关');
  if (scoreForField(point, query, 'weakTerms') > 0) reasons.push('对应你希望加强的基础');
  if (scoreForField(point, query, 'interestTerms') > 0) reasons.push('回应你提到的兴趣方向');
  if (scoreForField(point, query, 'strongTerms') > 0) reasons.push('保留你已有基础的衔接位置');
  return reasons;
}

function createTreeName(points: KnowledgePoint[], query: GoalQuery): string {
  const goalAnchor = points
    .map((point) => ({ point, score: scoreForField(point, query, 'goalTerms') }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.point.name.length - b.point.name.length || a.point.name.localeCompare(b.point.name, 'zh-CN'))[0]?.point;
  const anchor = goalAnchor ?? points[0];
  return anchor ? `${anchor.name} · 定向学习` : '目标知识树';
}

export function composeGoalTree(prompt: string): GoalTreeDraft {
  const query = parseGoalQuery(prompt);
  if (!query.original) throw new Error('请先描述你现在想做什么。');
  const registry = getRegistry();
  const points = [...registry.points.values()];
  if (points.length === 0) throw new Error('当前知识库还没有可整理的知识点。');

  const pointById = new Map(points.map((point) => [point.id, point]));
  const baseScores = new Map(points.map((point) => [point.id, scorePoint(point, query)]));
  const scores = propagateScores(baseScores, registry.relations);
  const ranked = points
    .map((point) => ({ point, score: scores.get(point.id) ?? 0, base: baseScores.get(point.id) ?? 0 }))
    .sort((a, b) => b.score - a.score || b.base - a.base || a.point.name.localeCompare(b.point.name, 'zh-CN'));
  if ((ranked[0]?.score ?? 0) <= 0) throw new Error('当前知识库里还没有找到与这段描述相关的内容。');

  const neighbors = buildNeighbors(registry.relations);
  const goalAnchor = points
    .map((point) => ({ point, score: scoreForField(point, query, 'goalTerms') }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.point.name.length - b.point.name.length || a.point.name.localeCompare(b.point.name, 'zh-CN'))[0]?.point;
  const primaryId = goalAnchor?.id ?? ranked
    .slice()
    .sort((a, b) => b.score - a.score || a.point.name.length - b.point.name.length || a.point.name.localeCompare(b.point.name, 'zh-CN'))[0].point.id;
  const distanceFromPrimary = (id: string) => shortestPath(new Set([primaryId]), id, neighbors)?.length ?? Number.POSITIVE_INFINITY;
  const categorySeeds = (['goalTerms', 'weakTerms', 'strongTerms', 'interestTerms'] as const)
    .flatMap((field) => points
      .map((point) => ({ point, score: scoreForField(point, query, field) }))
      .filter((entry) => entry.score > 0 && (field === 'goalTerms' || entry.point.id !== primaryId))
      .sort((a, b) => b.score - a.score
        || matchSpecificity(b.point, query[field]) - matchSpecificity(a.point, query[field])
        || distanceFromPrimary(a.point.id) - distanceFromPrimary(b.point.id)
        || a.point.name.length - b.point.name.length
        || a.point.name.localeCompare(b.point.name, 'zh-CN'))
      .slice(0, 1)
      .map((entry) => entry.point.id));
  const seedIds = unique([primaryId, ...categorySeeds]);
  const termCount = unique([...query.goalTerms, ...query.weakTerms, ...query.interestTerms, ...query.strongTerms]).length;
  const targetSize = Math.min(36, Math.max(18, 18 + termCount * 4));
  const selected = new Set<string>();
  const reasons: Record<string, string[]> = {};
  const add = (id: string, reason: string) => {
    if (!pointById.has(id) || selected.size >= targetSize) return;
    selected.add(id);
    reasons[id] = unique([...(reasons[id] ?? explainMatch(pointById.get(id)!, query)), reason]);
  };
  const evidenceBoost = (id: string) => registry.relations.filter((relation) => relation.sourcePointId === id && relation.type === 'practice_for').length * 5;
  const addDirectNeighbors = (seedId: string, limit: number) => {
    registry.relations
      .filter((relation) => relation.type !== 'related' && (relation.sourcePointId === seedId || relation.targetPointId === seedId))
      .map((relation) => ({
        id: relation.sourcePointId === seedId ? relation.targetPointId : relation.sourcePointId,
        type: relation.type,
      }))
      .filter((entry) => (scores.get(entry.id) ?? 0) > 0)
      .sort((a, b) => (scores.get(b.id) ?? 0) + evidenceBoost(b.id) - ((scores.get(a.id) ?? 0) + evidenceBoost(a.id)) || a.id.localeCompare(b.id))
      .slice(0, limit)
      .forEach((entry) => add(entry.id, entry.type === 'practice_for' ? '用于验证重点知识的直接练习' : '重点知识的直接前置或后续'));
  };

  add(seedIds[0], '最相关的起始知识点');
  addDirectNeighbors(seedIds[0], 4);
  for (const seedId of seedIds.slice(1)) {
    const path = shortestPath(selected, seedId, neighbors);
    if (!path || path.length > 12 || selected.size + path.length - 1 > targetSize) continue;
    path.forEach((id, index) => add(id, id === seedId ? '自然语言匹配的重点' : index === 0 ? '连接已有重点' : '连接重点所需的知识'));
    addDirectNeighbors(seedId, 4);
  }

  const directCandidates = registry.relations
    .filter((relation) => (relation.type === 'hierarchy' || relation.type === 'prerequisite' || relation.type === 'practice_for')
      && seedIds.some((seedId) => selected.has(seedId) && (relation.sourcePointId === seedId || relation.targetPointId === seedId)))
    .map((relation) => ({
      id: seedIds.includes(relation.sourcePointId) && selected.has(relation.sourcePointId) ? relation.targetPointId : relation.sourcePointId,
      type: relation.type,
    }))
    .filter((entry) => (scores.get(entry.id) ?? 0) > 0)
    .sort((a, b) => (scores.get(b.id) ?? 0) + evidenceBoost(b.id) - ((scores.get(a.id) ?? 0) + evidenceBoost(a.id)) || a.id.localeCompare(b.id));
  for (const candidate of directCandidates) {
    if (selected.size >= targetSize) break;
    add(candidate.id, candidate.type === 'practice_for' ? '用于验证重点知识的直接练习' : '重点知识的直接前置或后续');
  }

  for (const entry of ranked) {
    if (selected.size >= targetSize || entry.score <= 0) break;
    const path = shortestPath(selected, entry.point.id, neighbors);
    if (!path || path.length > 6 || selected.size + path.length - 1 > targetSize) continue;
    path.forEach((id) => add(id, id === entry.point.id ? '由知识关系扩展的相关内容' : '保持子图连贯所需的知识'));
  }

  if (selected.size < 8) {
    const queue = [...selected];
    for (let index = 0; index < queue.length && selected.size < 8; index += 1) {
      for (const neighbor of neighbors.get(queue[index]) ?? []) {
        if (!selected.has(neighbor)) queue.push(neighbor);
        add(neighbor, '补全这段学习范围的直接关系');
        if (selected.size >= 8) break;
      }
    }
  }

  const pointIds = [...selected].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || a.localeCompare(b));
  const selectedPoints = pointIds.map((id) => pointById.get(id)!).filter(Boolean);
  return {
    name: createTreeName(selectedPoints, query),
    description: `围绕“${query.original}”从当前知识库整理的学习范围，包含 ${pointIds.length} 个已有知识点。`,
    pointIds,
    seedPointIds: seedIds.filter((id) => selected.has(id)),
    reasons,
  };
}
