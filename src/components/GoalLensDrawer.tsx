import { Check, Target, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { matchGoal, nodesById } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';

const lenses = [
  ['direction-408', '计算机考研 408', '数据结构、组成原理、操作系统与网络'],
  ['direction-ai-engineering', 'AI 工程', '机器学习、深度学习、数据工程与 LLM'],
  ['direction-game-development', '游戏开发', '数学、引擎、图形与性能'],
  ['direction-frontend-development', '前端工程', '浏览器、React、性能与可访问性'],
] as const;

export function GoalLensDrawer() {
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const selectedGoalId = useKnowledgeStore((state) => state.selectedGoalId);
  const selectGoal = useKnowledgeStore((state) => state.selectGoal);
  const closePanel = useKnowledgeStore((state) => state.closePanel);
  const [input, setInput] = useState('');
  const open = activePanel === 'lens';

  const submit = () => {
    const match = matchGoal(input);
    if (match.nodeId) selectGoal(match.nodeId);
  };
  return (
    <AnimatePresence>
      {open && <motion.aside className="side-drawer side-drawer--right" aria-label="选择目标" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
        <header className="drawer-header"><span>选择目标</span><button onClick={closePanel} aria-label="关闭选择目标"><X size={17} /></button></header>
        <p className="drawer-copy">选择一个方向，相关知识会突出显示，其他内容仍保留在空间中。</p>
        <div className="lens-list">
          <button className={`lens-option ${selectedGoalId === null ? 'is-active' : ''}`} onClick={() => selectGoal(null)}><span>计算机科学全景</span>{selectedGoalId === null && <Check size={16} />}</button>
          {lenses.map(([id, name, description]) => <button key={id} className={`lens-option ${selectedGoalId === id ? 'is-active' : ''}`} onClick={() => selectGoal(id)}><span><strong>{name}</strong><small>{description}</small></span>{selectedGoalId === id && <Check size={16} />}</button>)}
        </div>
        <div className="lens-custom">
          <label htmlFor="goal-input">用一句话描述你的目标</label>
          <div><input id="goal-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="例如：我要成为游戏开发工程师" /><button onClick={submit} aria-label="解析目标"><Target size={16} /></button></div>
          {selectedGoalId && <small>当前目标：{nodesById.get(selectedGoalId)?.name}</small>}
        </div>
      </motion.aside>}
    </AnimatePresence>
  );
}
