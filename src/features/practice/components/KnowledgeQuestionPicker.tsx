import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { knowledgeGraph } from '../../../data/knowledgeGraph';

export function KnowledgeQuestionPicker({
  mode,
  branchId,
}: {
  mode: 'goal' | 'node';
  branchId: string;
}) {
  const nodes = knowledgeGraph.nodes.filter((node) => {
    if (node.branchId !== branchId) return false;
    if (mode === 'goal') return node.type === 'goal';
    return ['course', 'skill', 'knowledge', 'practice'].includes(node.type);
  });

  return (
    <div className="picker-grid">
      {nodes.map((node) => (
        <Link
          key={node.id}
          className="picker-item"
          to={`/practice/session/${mode === 'goal' ? 'goal' : 'node'}:${node.id}`}
        >
          <span>{node.name}</span>
          <small>{mode === 'goal' ? '目标' : node.type === 'course' ? '课程' : '知识点'}</small>
          <ArrowRight size={13} style={{ color: 'var(--it-text-faint)' }} />
        </Link>
      ))}
    </div>
  );
}
