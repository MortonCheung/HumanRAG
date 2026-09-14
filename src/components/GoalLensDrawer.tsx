import { Target, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { composeGoalTree } from '../ai/knowledge-tree/GoalTreeComposer';
import { createTree, migrateV9 } from '../domain/knowledge/migration';
import { useGoalTreeTransitionStore } from '../features/spatial/transitions/goalTreeTransitionStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { loadLibraryHomePage } from '../features/library/loadLibraryHomePage';
import { prepareTreeRuntime } from '../features/knowledge-tree/prepareTreeRuntime';

export function GoalLensDrawer() {
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const closePanel = useKnowledgeStore((state) => state.closePanel);
  const beginExtraction = useGoalTreeTransitionStore((state) => state.begin);
  const markTreeReady = useGoalTreeTransitionStore((state) => state.markTreeReady);
  const failExtraction = useGoalTreeTransitionStore((state) => state.fail);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const open = activePanel === 'lens';

  const handleCompose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() || composing) return;
    setComposing(true);
    setError(null);
    try {
      const domain = migrateV9();
      const draft = composeGoalTree(prompt);
      beginExtraction(draft);
      await Promise.all([
        loadLibraryHomePage(),
        prepareTreeRuntime(draft),
      ]);
      const tree = createTree(domain.library.id, {
        identity: { name: draft.name, description: draft.description, color: '#b1d8ca' },
        pointIds: draft.pointIds,
      });
      markTreeReady(tree.id);
      closePanel();
    } catch (failure) {
      const message = '没能整理这棵知识树。保留了你的输入，可以再试一次。';
      failExtraction(failure instanceof Error ? failure.message : message);
      setError(message);
      setComposing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && <motion.aside className="side-drawer side-drawer--right goal-panel" aria-label="整理目标" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
        <header className="drawer-header"><span>目标</span><button type="button" onClick={closePanel} aria-label="关闭目标"><X size={17} /></button></header>
        <form className="goal-panel__form" onSubmit={handleCompose}>
          <label htmlFor="goal-prompt">你现在想做什么？</label>
          <textarea
            id="goal-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例如：我准备考 408，网络比较薄弱，数据结构还可以。"
            rows={4}
            maxLength={240}
            autoFocus
          />
          <p className="goal-panel__hint">可以补充你的基础、兴趣、擅长或薄弱内容。</p>
          {error && <p className="goal-panel__error" role="alert">{error}</p>}
          <button className="goal-panel__submit" type="submit" disabled={!prompt.trim() || composing}>
            <Target size={16} aria-hidden="true" />{composing ? '正在整理…' : '生成知识树'}
          </button>
        </form>
      </motion.aside>}
    </AnimatePresence>
  );
}
