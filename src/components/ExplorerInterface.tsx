import { MOTION } from '../motion/tokens';
import { AnimatePresence, motion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import type { SceneModel } from '../graph/types';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { CommandPalette } from './CommandPalette';
import { GoalLensDrawer } from './GoalLensDrawer';
import { NodeInspector } from './NodeInspector';
import { TopBar } from './TopBar';

export function ExplorerInterface({ model: _model }: { model: SceneModel }) {
  const unmatched = useKnowledgeStore((state) => state.unmatchedGoal);
  const closePanel = useKnowledgeStore((state) => state.closePanel);
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const qualityPreference = useKnowledgeStore((state) => state.qualityPreference);
  const setQualityPreference = useKnowledgeStore((state) => state.setQualityPreference);
  return (
    <>
      <TopBar />
      <CommandPalette />
      <GoalLensDrawer />
      <NodeInspector />
      <AnimatePresence>
        {activePanel === 'settings' && <motion.aside className="side-drawer side-drawer--right settings-panel" aria-label="性能设置" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: MOTION.duration.panel, ease: MOTION.ease.out }}><header className="drawer-header"><span>性能设置</span><button onClick={closePanel} aria-label="关闭性能设置"><X size={16} weight="regular" /></button></header><div className="lens-list">{([['auto', '自动'], ['quality', '高画质'], ['balanced', '均衡'], ['performance', '性能优先']] as const).map(([value, label]) => <button key={value} className={`lens-option ${qualityPreference === value ? 'is-active' : ''}`} aria-pressed={qualityPreference === value} onClick={() => setQualityPreference(value)}><span>{label}</span></button>)}</div></motion.aside>}
        {unmatched && <motion.div className="toast toast--warning" role="status" initial={{ opacity: 0, y: -8, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, x: '-50%' }}>没有找到精确目标，已保留当前知识全景。</motion.div>}
      </AnimatePresence>
    </>
  );
}
