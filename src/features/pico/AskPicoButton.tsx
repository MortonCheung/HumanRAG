import type { PicoExplicitContext } from './picoTypes';
import { usePicoStore } from './picoStore';

export function AskPicoButton({ context, label = '问问 Pico', className = '' }: {
  context: PicoExplicitContext;
  label?: string;
  className?: string;
}) {
  const askAndSend = usePicoStore((state) => state.askAndSend);
  const busy = usePicoStore((state) => state.busy);
  const cooldownUntil = usePicoStore((state) => state.cooldownUntil);
  const disabled = busy || Date.now() < cooldownUntil;
  return <button
    type="button"
    className={`ask-pico-button ${className}`.trim()}
    aria-label={`${label}：${context.title}`}
    disabled={disabled}
    onClick={() => { void askAndSend(context); }}
  >{label}</button>;
}
