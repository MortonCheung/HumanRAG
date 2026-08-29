import { AnimatePresence, motion } from 'motion/react';
import { knowledgeGraph } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { ExplorerHeader } from './ExplorerHeader';
import { NodeInspector } from './NodeInspector';
import { PathNavigator } from './PathNavigator';

export function ExplorerInterface() {
  const unmatched = useKnowledgeStore((state) => state.unmatchedGoal);
  const select = useKnowledgeStore((state) => state.selectNode);

  return (
    <>
      <ExplorerHeader />
      <NodeInspector />
      <PathNavigator />
      <AnimatePresence>
        {unmatched && (
          <motion.div className="toast toast--warning" role="status" initial={{ opacity: 0, y: -8, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, x: '-50%' }}>
            暂未找到精确方向。可尝试输入考研408、AI工程、游戏开发或前端开发。
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="sr-only" aria-label="知识节点导航">
        {knowledgeGraph.nodes.map((node) => <button key={node.id} onClick={() => select(node.id)}>{node.name}</button>)}
      </nav>
    </>
  );
}
