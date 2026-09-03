import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { KnowledgePoint, KnowledgeRelation, KnowledgeTree } from '../../../domain/knowledge/types';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import { toCustomEdges, toCustomNodes } from '../treeGraphAdapter';

export function SelectedTreeShowcase({ tree, points, relations }: {
  tree: KnowledgeTree | null;
  points: KnowledgePoint[];
  relations: KnowledgeRelation[];
}) {
  const nodes = useMemo(() => toCustomNodes(points), [points]);
  const edges = useMemo(() => toCustomEdges(relations, new Set(points.map((point) => point.id))), [points, relations]);

  if (!tree) {
    return <div className="library-manager__empty-preview">选择一棵知识树查看预览</div>;
  }

  return (
    <section className="library-showcase" aria-label={`${tree.name}三维预览`}>
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={tree.id}
          className="library-showcase__layer"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.012 }}
          transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="library-showcase__meta">
            <span>{tree.ownerType === 'system' ? '系统' : '个人'}</span>
            <strong>{tree.name}</strong>
            <small>{points.length} 个节点</small>
          </div>
          <div className="library-showcase__canvas">
            <CustomTreeCanvas nodes={nodes} edges={edges} selectedId={null} interactive={false} autoRotate />
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
