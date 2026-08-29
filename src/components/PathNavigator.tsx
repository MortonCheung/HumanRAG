import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { nodesById } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';

export function PathNavigator() {
  const open = useKnowledgeStore((state) => state.isPathRibbonOpen);
  const path = useKnowledgeStore((state) => state.learningPath);
  const selectedNodeId = useKnowledgeStore((state) => state.selectedNodeId);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const close = useKnowledgeStore((state) => state.closeLearningPath);
  const rawIndex = selectedNodeId ? path.indexOf(selectedNodeId) : -1;
  const index = rawIndex >= 0 ? rawIndex : 0;
  const node = nodesById.get(path[index]);

  return (
    <AnimatePresence>
      {open && path.length > 0 && node && (
        <motion.nav
          className="path-navigator"
          aria-label="推荐学习路径"
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="path-navigator__step" onClick={() => index > 0 && selectNode(path[index - 1])} disabled={index === 0} aria-label="上一个路径节点"><CaretLeft size={16} /></button>
          <button className="path-navigator__current" onClick={() => selectNode(node.id)}>
            <small>{String(index + 1).padStart(2, '0')} / {String(path.length).padStart(2, '0')}</small>
            <strong>{node.name}</strong>
            <span style={{ '--path-progress': `${((index + 1) / path.length) * 100}%` } as React.CSSProperties} />
          </button>
          <button className="path-navigator__step" onClick={() => index < path.length - 1 && selectNode(path[index + 1])} disabled={index === path.length - 1} aria-label="下一个路径节点"><CaretRight size={16} /></button>
          <button className="path-navigator__close" onClick={close} aria-label="关闭学习路径"><X size={15} /></button>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
