import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp, SpeakerSimpleHigh, SpeakerSimpleX, X } from '@phosphor-icons/react';
import { MOTION } from '../../motion/tokens';
import { stopSpeech } from '../../ai/speech/speechClient';
import { setSpeechEnabled, useSpeechEnabled } from '../../ai/speech/speechPreferences';
import { useSpatialOccluder } from '../spatial/SpatialViewport';
import { PicoActor } from './PicoActor';
import { usePicoStore } from './picoStore';
import './pico.css';

export function PicoDock() {
  const reducedMotion = Boolean(useReducedMotion());
  const open = usePicoStore((state) => state.open);
  const face = usePicoStore((state) => state.face);
  const presence = usePicoStore((state) => state.presence);
  const picoMotion = usePicoStore((state) => state.motion);
  const motionNonce = usePicoStore((state) => state.motionNonce);
  const pageContext = usePicoStore((state) => state.pageContext);
  const explicitContext = usePicoStore((state) => state.explicitContext);
  const messages = usePicoStore((state) => state.messages);
  const busy = usePicoStore((state) => state.busy);
  const focusNonce = usePicoStore((state) => state.focusNonce);
  const cooldownUntil = usePicoStore((state) => state.cooldownUntil);
  const openDock = usePicoStore((state) => state.openDock);
  const closeDock = usePicoStore((state) => state.closeDock);
  const send = usePicoStore((state) => state.send);
  const react = usePicoStore((state) => state.react);
  const [draft, setDraft] = useState('');
  const speechEnabled = useSpeechEnabled();
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const occluder = useSpatialOccluder('pico', open);
  const transition = { duration: reducedMotion ? 0 : MOTION.duration.panel, ease: MOTION.ease.out };

  useEffect(() => () => stopSpeech(), []);

  useEffect(() => { if (open && focusNonce > 0) requestAnimationFrame(() => input.current?.focus()); }, [focusNonce, open]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: 'end' }); }, [messages, open]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || Date.now() < cooldownUntil) return;
    setDraft('');
    await send(text);
  };
  const contextTitle = explicitContext?.title ?? pageContext?.title ?? '当前页面';

  return <>
    {open && <div ref={occluder.ref} className="pico-dock-occluder" aria-hidden />}
    <motion.button
      type="button"
      className={`pico-actor-host${open ? ' is-open' : ''}`}
      aria-label={open ? 'Pico' : '打开 Pico'}
      aria-hidden={presence === 'docked' ? undefined : true}
      tabIndex={presence === 'docked' && !open ? 0 : -1}
      onClick={open ? undefined : openDock}
      onMouseEnter={() => react('attention')}
      animate={{ scale: presence === 'docked' ? open ? 0.82 : 1 : 0.7, opacity: presence === 'docked' ? 1 : 0 }}
      transition={transition}
      data-pico-presence={presence}
      data-pico-face={face}
      data-pico-motion={picoMotion}
      style={{ pointerEvents: presence === 'docked' ? undefined : 'none' }}
    ><PicoActor face={face} motion={picoMotion} motionNonce={motionNonce} motionAllowed={!reducedMotion && presence === 'docked'} /></motion.button>
    <AnimatePresence initial={false}>
      {open && <motion.aside
        className="pico-dock"
        data-page-context-key={pageContext?.key}
        data-explicit-context-type={explicitContext?.type}
        data-explicit-context-title={explicitContext?.title}
        role="complementary"
        aria-label="Pico 学习伙伴"
        initial={reducedMotion ? false : { opacity: 0, x: 22 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
        transition={transition}
      >
        <header className="pico-dock__header"><div><strong>Pico</strong><span>正在看 · {contextTitle}</span></div>
          <button type="button" className="pico-dock__speech" role="switch" aria-checked={speechEnabled} aria-label={speechEnabled ? '关闭自动朗读' : '开启自动朗读'} onClick={() => setSpeechEnabled(!speechEnabled)}>{speechEnabled ? <SpeakerSimpleHigh size={18} /> : <SpeakerSimpleX size={18} />}</button>
          <button type="button" aria-label="关闭 Pico" onClick={closeDock}><X size={20} /></button></header>
        <div className="pico-dock__messages" aria-live="polite">
          {messages.length === 0 && <div className="pico-dock__empty"><strong>一起看当前内容</strong><p>指出你卡住的一句、一步或一道题，我会优先结合当前页面回答。</p></div>}
          {messages.map((item) => item.role === 'context'
            ? <div className="pico-context-change" key={item.id}><span>{item.content}</span></div>
            : <article key={item.id} data-source={item.role === 'assistant' ? item.source : undefined} className={`pico-message pico-message--${item.role}`}><span>{item.role === 'user' ? '你' : 'Pico'}</span>{item.role === 'user' && item.contextTitle && <div className="pico-message__quote" title={item.contextExcerpt}>引用 · {item.contextTitle}</div>}<p>{item.content}</p>{item.role === 'assistant' && item.source === 'mock' && <small>演示回复</small>}</article>)}
          {busy && <div className="pico-thinking" role="status">Pico 正在整理当前内容…</div>}
          <div ref={end} />
        </div>
        <form className="pico-composer" onSubmit={submit}>
          <label htmlFor="pico-input">问当前内容</label>
          <div><textarea ref={input} id="pico-input" rows={2} maxLength={600} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="这一步为什么这样做？" /><button type="submit" aria-label="发送给 Pico" disabled={!draft.trim() || busy || Date.now() < cooldownUntil}><ArrowUp size={18} /></button></div>
        </form>
      </motion.aside>}
    </AnimatePresence>
  </>;
}

export default PicoDock;
