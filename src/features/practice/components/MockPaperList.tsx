import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { MOCK_PAPERS } from '../../../data/v6/generators/generateQuestionVariants';

export function MockPaperList({ branchId }: { branchId: string }) {
  const papers = MOCK_PAPERS.filter((paper) => paper.branchId === branchId);
  return (
    <div className="paper-list">
      {papers.map((paper) => (
        <Link key={paper.id} className="paper-item" to={`/practice/session/paper:${paper.id}`}>
          <span>
            <span className="paper-item__title">{paper.title}</span>
            <span className="paper-item__meta">
              {paper.questionIds.length} 题 · 预计 {paper.estimatedMinutes} 分钟
            </span>
          </span>
          <ArrowRight size={14} style={{ color: 'var(--it-text-faint)' }} />
        </Link>
      ))}
    </div>
  );
}
