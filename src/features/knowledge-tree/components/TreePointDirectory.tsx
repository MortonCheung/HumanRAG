import { useState } from 'react';
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { useParams } from 'react-router-dom';
import { usePageNavigate as useNavigate } from '../../../app/pageNavigation';
import { ROUTES } from '../../../app/routes';
import type { KnowledgePoint, KnowledgeRelation } from '../../../domain/knowledge/types';
import { getRegistry, getTree } from '../../../domain/knowledge/selectors';
import { contentRepository } from '../../../services/content/ContentRepository';
import { learningStatusFromEvidence, useProgressStore } from '../../../store/progressStore';
import { useUserStore } from '../../../store/userStore';
import { WorkspaceActions } from '../../workspace/WorkspaceHeader';
import '../tree-directory.css';

export function filterTreePoints(points: KnowledgePoint[], query: string, pointFilterId?: string | null) {
  if (pointFilterId) return points.filter((point) => point.id === pointFilterId);
  const words = query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return points.filter((point) => {
    const searchable = `${point.name} ${point.tags.join(' ')}`.normalize('NFKC').toLocaleLowerCase();
    return words.every((word) => searchable.includes(word));
  });
}

/** Group by the existing hierarchy, not keywords or a second curriculum model. */
export function groupTreePoints(points: KnowledgePoint[], allPoints: Map<string, KnowledgePoint>, relations: KnowledgeRelation[]) {
  const parents = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.type !== 'hierarchy' && relation.type !== 'practice_for') continue;
    parents.set(relation.targetPointId, [...(parents.get(relation.targetPointId) ?? []), relation.sourcePointId]);
  }
  const groups = new Map<string, { id: string; name: string; points: KnowledgePoint[] }>();
  for (const point of points) {
    const queue = [...(parents.get(point.id) ?? [])];
    const seen = new Set([point.id]);
    let subject: KnowledgePoint | undefined;
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const parent = allPoints.get(id);
      if (parent?.kind === 'course') { subject = parent; break; }
      queue.push(...(parents.get(id) ?? []));
    }
    const id = subject?.id ?? 'ungrouped';
    const group = groups.get(id) ?? { id, name: subject?.name ?? '知识点', points: [] };
    group.points.push(point);
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function TreePointDirectory({ mode, points, initialPointFilterId }: { mode: 'learn' | 'practice'; points: KnowledgePoint[]; initialPointFilterId?: string }) {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const navigate = useNavigate();
  const learnerId = useUserStore((state) => state.activeProfileId);
  const evidence = useProgressStore((state) => state.evidenceRecords);
  const initialPoint = points.find((point) => point.id === initialPointFilterId);
  const [query, setQuery] = useState(initialPoint?.name ?? '');
  const [pointFilterId, setPointFilterId] = useState(initialPoint?.id ?? null);
  const visible = filterTreePoints(points, query, pointFilterId);
  const registry = getRegistry();
  const groups = groupTreePoints(visible, registry.points, registry.relations);
  const treeName = treeId ? getTree(treeId)?.name : undefined;
  const totalQuestions = new Set(points.flatMap((point) => contentRepository.getQuestionsForNode(point.id).map((question) => question.id))).size;
  const availableCount = points.filter((point) => mode === 'learn'
    ? Boolean(contentRepository.getTeachingUnitForNode(point.id))
    : contentRepository.getQuestionsForNode(point.id).length > 0).length;
  const passedCount = points.filter((point) => learningStatusFromEvidence(evidence, point.id, learnerId).status === 'passed').length;

  return (
    <section className={`tree-directory tree-directory--${mode}`} aria-label={mode === 'learn' ? '知识点学习目录' : '知识点题库目录'}>
      <WorkspaceActions>
        <label className="context-nav__search">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <input type="search" aria-label="搜索本树知识点" placeholder="搜索知识点" value={query} onChange={(event) => { setQuery(event.target.value); setPointFilterId(null); }} />
        </label>
      </WorkspaceActions>
      <header className="tree-directory__intro">
        <p className="tree-directory__eyebrow">{treeName ?? '知识树'}</p>
        <h1>{mode === 'learn' ? '学习' : '题库'}<span className="tree-directory__signal" aria-hidden="true" /></h1>
        <dl className="tree-directory__totals">
          <div><dt>{mode === 'learn' ? '可学习知识点' : '题目'}</dt><dd>{mode === 'learn' ? availableCount : totalQuestions}</dd></div>
          <div><dt>{mode === 'learn' ? '已验证' : '覆盖知识点'}</dt><dd>{mode === 'learn' ? passedCount : availableCount}</dd></div>
        </dl>
      </header>
      <div className="tree-directory__content">
      <div className="tree-directory__heading">
        <h2>知识点</h2>
        <span role="status">{visible.length === points.length ? `${points.length} 个知识点` : `${visible.length} / ${points.length} 个知识点`}</span>
      </div>
      {visible.length > 0 ? groups.map((group) => <section className="tree-directory__group" key={group.id} aria-label={group.name}>
        <h3>{group.name}<span>{String(group.points.length).padStart(2, '0')}</span></h3>
        <ul className="tree-directory__list">
        {group.points.map((point) => {
          const unit = contentRepository.getTeachingUnitForNode(point.id);
          const questionCount = contentRepository.getQuestionsForNode(point.id).length;
          const available = mode === 'learn' ? Boolean(unit) : questionCount > 0;
          const status = learningStatusFromEvidence(evidence, point.id, learnerId);
          const detail = !available ? mode === 'learn' ? '暂无教学' : '暂无题目' : mode === 'practice' ? `${questionCount} 道题` : status.status === 'unverified' ? '开始学习' : status.label;
          return <li key={point.id}>
            <button type="button" disabled={!available} onClick={() => {
              if (!libraryId || !treeId) return;
              navigate(mode === 'learn' ? ROUTES.pointLearn(libraryId, treeId, point.id) : ROUTES.pointPractice(libraryId, treeId, point.id), { state: { origin: { kind: 'tree', libraryId, treeId } } });
            }}>
              <span className={`tree-directory__node${status.status === 'passed' && mode === 'learn' ? ' is-verified' : ''}`} aria-hidden="true" />
              <strong title={point.name}>{point.name}</strong>
              <span className={`tree-directory__meta${status.status === 'passed' && mode === 'learn' ? ' is-verified' : ''}`}>{detail}</span>
              <ArrowRight className="tree-directory__arrow" size={18} aria-hidden="true" />
            </button>
          </li>;
        })}
      </ul></section>) : <p className="tree-directory__empty">{points.length ? '没有匹配的知识点。' : '这棵树还没有知识点。'}</p>}
      </div>
    </section>
  );
}
