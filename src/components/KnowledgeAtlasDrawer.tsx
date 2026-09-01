import { ArrowUpRight, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { knowledgeGraph } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { colorForBranch } from '../design/domainPalette';

const domains = [
  ['408', '理论与系统'],
  ['ai', 'AI 与数据'],
  ['game', '图形与游戏'],
  ['frontend', 'Web 与前端'],
] as const;

export function KnowledgeAtlasDrawer() {
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const closePanel = useKnowledgeStore((state) => state.closePanel);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const open = activePanel === 'atlas';
  return (
    <AnimatePresence>
      {open && <motion.aside className="side-drawer side-drawer--right" aria-label="浏览知识" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
        <header className="drawer-header"><span>浏览知识</span><button onClick={closePanel} aria-label="关闭浏览知识"><X size={17} /></button></header>
        <p className="drawer-copy">从一个方向进入课程、知识点和练习。浏览不会改变当前目标。</p>
        <div className="atlas-list">
          {domains.map(([id, name]) => {
            const members = knowledgeGraph.nodes.filter((node) => node.branchId === id);
            const entry = members.find((node) => node.type === 'direction');
            return <button key={id} onClick={() => entry && selectNode(entry.id)}><i style={{ background: colorForBranch(id) }} /><span><strong>{name}</strong><small>{members.length} 节点</small></span><ArrowUpRight size={16} /></button>;
          })}
        </div>
      </motion.aside>}
    </AnimatePresence>
  );
}
