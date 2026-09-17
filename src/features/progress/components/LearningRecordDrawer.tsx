import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import type { EvidenceRecord } from '../../../data/v6/schemas/progressSchema';
import { contentRepository } from '../../../services/content/ContentRepository';
import { TCP_FRAGMENTS, TCP_REASONS, TCP_VERSION } from '../../../data/v6/handcrafted/tcpLesson';
import { MOTION } from '../../../motion/tokens';

const SOURCE = { diagnostic: '尝试', 'guided-practice': '练习', 'independent-check': '测验', practice: '练习' };
const HELP = { independent: '无提示', hint: '使用提示', demonstration: '示范后完成', unknown: '帮助情况未知' };

function formatResponse(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed.values)) return `${parsed.values.join('、')}；${TCP_REASONS.find((reason) => reason.id === parsed.reason)?.text ?? '未记录理由'}`;
  } catch {
    // Old snapshots may contain plain text.
  }
  return value;
}

function EvidenceEntry({ record }: { record: EvidenceRecord }) {
  const fragment = Object.values(TCP_FRAGMENTS).find((item) => item.id === record.fragmentId);
  return <article className="learning-record">
    <div className="learning-record__heading">
      <div>
        <strong>{contentRepository.getNode(record.nodeId)?.name ?? record.nodeId}</strong>
        <span>{SOURCE[record.source]} · {record.result === 'correct' ? '正确' : record.result === 'partial' ? '部分正确' : '需巩固'} · {HELP[record.assistance ?? 'unknown']}{record.firstExposure === false ? ' · 已曝光任务' : record.firstExposure === true ? ' · 首次任务' : ''}</span>
      </div>
      <time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
    </div>
    {record.snapshot && <details>
      <summary>查看作答与依据</summary>
      <div className="learning-record__snapshot">
        <p>{record.snapshot.stem}</p>
        <dl>
          <dt>你的作答</dt><dd>{formatResponse(record.snapshot.selected)}</dd>
          <dt>当时的判断依据</dt><dd>{record.snapshot.explanation}</dd>
          {fragment && <><dt>所用片段</dt><dd>{fragment.title}</dd></>}
          {record.decisionReason && <><dt>下一步选择依据</dt><dd>{record.decisionReason}</dd></>}
        </dl>
        <span className="learning-record__version">{record.contentVersion ?? '版本未知'}{record.attempt ? ` · 第 ${record.attempt} 轮` : ''}</span>
        {record.contentVersion === TCP_VERSION && <a href="https://www.rfc-editor.org/rfc/rfc5681.html#section-3.1" target="_blank" rel="noreferrer">RFC 5681 §3.1 · 逐 RTT 简化教学模型</a>}
      </div>
    </details>}
  </article>;
}

export function LearningRecordDrawer({ records, open, onOpen, onClose }: {
  records: readonly EvidenceRecord[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const [visibleCount, setVisibleCount] = useState(20);
  useEffect(() => {
    if (!open) return;
    setVisibleCount(20);
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.learning-record-trigger')?.focus());
  }, [open]);

  const transition = { duration: reducedMotion ? 0 : MOTION.duration.panel, ease: MOTION.ease.out };
  return <LayoutGroup id="learning-record-morph">
    {!open && <motion.button
      layoutId="learning-record-surface"
      type="button"
      className="learning-record-trigger"
      onClick={onOpen}
      transition={transition}
    >学习档案</motion.button>}
    <AnimatePresence initial={false}>
      {open && <>
        <motion.div
          key="learning-record-backdrop"
          className="learning-record-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}
          onPointerDown={onClose}
        />
        <motion.aside
          key="learning-record-drawer"
          layoutId="learning-record-surface"
          className="learning-record-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="learning-record-drawer-title"
          transition={transition}
        >
          <header className="learning-record-drawer__header">
            <div><span>学习证据</span><h2 id="learning-record-drawer-title">学习档案</h2></div>
            <button ref={closeRef} type="button" className="learning-record-drawer__close" aria-label="关闭学习档案" onClick={onClose}><X size={22} weight="bold" /></button>
          </header>
          <div className="learning-record-drawer__body">
            {records.length ? records.slice(0, visibleCount).map((record) => <EvidenceEntry key={record.id} record={record} />) : <div className="learning-record-drawer__empty"><strong>还没有可回放的详细记录</strong><p>完成一次带作答快照的教学或测验后，这里会保留题目、你的回答与当时依据。</p></div>}
            {records.length > visibleCount && <button type="button" className="learning-record-drawer__more" onClick={() => setVisibleCount((count) => count + 20)}>查看更多</button>}
          </div>
        </motion.aside>
      </>}
    </AnimatePresence>
  </LayoutGroup>;
}
