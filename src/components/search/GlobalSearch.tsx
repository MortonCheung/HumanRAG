import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { nodesById } from '../../data/knowledgeGraph';
import { ROUTES } from '../../app/routes';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { useUiStore } from '../../store/uiStore';

const TYPE_LABEL: Record<string, string> = {
  goal: '目标', direction: '方向', course: '课程', skill: '技能', knowledge: '知识点', practice: '练习',
};

export function GlobalSearch() {
  const open = useUiStore((state) => state.searchOpen);
  const close = useUiStore((state) => state.closeSearch);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    const list = [...nodesById.values()].filter((node) => node.name.toLowerCase().includes(trimmed));
    return list.slice(0, 24);
  }, [query]);

  const go = (nodeId: string) => {
    close();
    navigate(ROUTES.universe);
    selectNode(nodeId);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="mobile-nav-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div
            className="global-search"
            role="dialog"
            aria-label="全局搜索"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="global-search__input">
              <MagnifyingGlass size={18} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && results.length > 0) go(results[0].id); }}
                placeholder="搜索知识节点、课程或练习"
                aria-label="搜索"
              />
            </div>
            <div className="global-search__results">
              {query.trim() && results.length === 0 && <p className="global-search__empty">没有匹配的知识节点。</p>}
              {results.map((node) => (
                <button key={node.id} className="global-search__result" onClick={() => go(node.id)}>
                  <span>{node.name}</span>
                  <small>{TYPE_LABEL[node.type] ?? node.type}</small>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
