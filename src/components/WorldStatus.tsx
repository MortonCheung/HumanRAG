import { knowledgeGraph } from '../data/knowledgeGraph';
import { nodesById } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';

export function WorldStatus() {
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const goal = selectedGoalId ? nodesById.get(selectedGoalId) : null;
  return (
    <aside className="world-status" aria-live="polite">
      <span>COMPUTER SCIENCE</span>
      <strong>{goal ? `Lens: ${goal.name}` : 'Knowledge Universe'}</strong>
      <small>{knowledgeGraph.nodes.length} 个知识节点 / 4 个计算机领域</small>
    </aside>
  );
}
