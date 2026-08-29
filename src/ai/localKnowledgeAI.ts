import { DEFAULT_408_PATH, getDirectChildren, getIncoming, knowledgeGraph, nodesById } from '../data/knowledgeGraph';
import type { KnowledgeNode, UserProfile } from '../graph/types';
import { getPathToNode } from '../graph/relevance';

export function explainNode(nodeId: string, profile: UserProfile | null) {
  const node = nodesById.get(nodeId);
  if (!node) return '当前节点暂时没有可用解释。';
  const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
  const prerequisite = getIncoming(node.id, 'prerequisite').map((edge) => nodesById.get(edge.source)?.name).filter(Boolean).slice(0, 2);
  const practice = knowledgeGraph.edges.find((edge) => edge.relationType === 'practice_for' && edge.source === node.id);
  const practiceName = practice ? nodesById.get(practice.target)?.name : undefined;
  const profileHint = profile?.identity ? `结合你作为${profile.identity}的学习阶段，` : '';
  const relationHint = parent ? `它位于“${parent.name}”路径中。` : '';
  const preHint = prerequisite.length ? `建议先理解${prerequisite.join('、')}。` : '它可以作为当前路径中的一个独立切入点。';
  const practiceHint = practiceName ? `可以通过“${practiceName}”检验理解。` : '建议结合一个小型案例验证概念。';
  return `${profileHint}${node.description}${relationHint}${preHint}${practiceHint}`.slice(0, 180);
}

const courseOrderByDirection: Record<string, string[]> = {
  'direction-408': ['course-data-structures', 'course-computer-organization', 'course-operating-systems', 'course-computer-networks'],
  'direction-ai-engineering': ['course-python-engineering', 'course-machine-learning', 'course-deep-learning', 'course-data-engineering', 'course-llm-engineering'],
  'direction-game-development': ['course-game-programming', 'course-game-math', 'course-game-engine', 'course-game-systems', 'course-graphics-performance'],
  'direction-frontend-development': ['course-web-foundation', 'course-js-ts', 'course-react-engineering', 'course-browser-network', 'course-frontend-quality'],
};

export function generatePath(goalId: string | null) {
  if (!goalId) return [];
  if (goalId === 'direction-408') return DEFAULT_408_PATH;
  const path: string[] = [goalId];
  for (const courseId of courseOrderByDirection[goalId] ?? []) {
    path.push(courseId);
    for (const knowledge of getDirectChildren(courseId)) {
      path.push(knowledge.id);
      const practice = knowledgeGraph.edges.find((edge) => edge.relationType === 'practice_for' && edge.source === knowledge.id);
      if (practice && !path.includes(practice.target)) path.push(practice.target);
      if (path.length >= 18) return path;
    }
    if (path.length >= 18) return path;
  }
  return path;
}

export function pathLabels(path: string[]) {
  return path.map((id) => nodesById.get(id)).filter(Boolean) as KnowledgeNode[];
}

export function nodeBreadcrumb(nodeId: string) {
  return getPathToNode(nodeId);
}
