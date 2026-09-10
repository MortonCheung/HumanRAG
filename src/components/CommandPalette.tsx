import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { knowledgeGraph } from '../data/knowledgeGraph';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { colorForBranch } from '../design/domainPalette';

export function CommandPalette() {
  const activePanel = useKnowledgeStore((state) => state.activePanel);
  const closePanel = useKnowledgeStore((state) => state.closePanel);
  const selectNode = useKnowledgeStore((state) => state.selectNode);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const open = activePanel === 'search';

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 20);
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    const source = normalized
      ? knowledgeGraph.nodes.filter((node) => `${node.name} ${node.keywords.join(' ')} ${node.description}`.toLocaleLowerCase('zh-CN').includes(normalized))
      : knowledgeGraph.nodes.filter((node) => ['course', 'skill', 'knowledge'].includes(node.type));
    return source.slice(0, 9);
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.section className="command-palette" role="dialog" aria-modal="true" aria-label="搜索知识节点" initial={{ opacity: 0, y: 10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.985 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <div className="command-palette__input">
            <MagnifyingGlass size={18} />
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索知识、技能或练习" aria-label="搜索输入" />
            <button onClick={closePanel} aria-label="关闭搜索"><X size={17} /></button>
          </div>
          <div className="command-palette__results">
            <span className="command-palette__label">{query ? '匹配节点' : '建议探索'}</span>
            {results.map((node) => (
              <button key={node.id} className="command-result" onClick={() => selectNode(node.id)}>
                <i style={{ background: colorForBranch(node.branchId) }} />
                <span><strong>{node.name}</strong><small>{node.type === 'knowledge' ? '概念' : node.type === 'practice' ? '练习' : node.type === 'skill' ? '技能' : '课程'}</small></span>
              </button>
            ))}
            {results.length === 0 && <p>没有找到匹配节点。可以尝试“链表”“TCP”“Transformer”或“React”。</p>}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
