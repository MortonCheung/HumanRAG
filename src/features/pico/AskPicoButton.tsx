import type { PicoExplicitContext } from './picoTypes';
import { usePicoStore } from './picoStore';

export function AskPicoButton({ context, label = '问问 Pico', className = '' }: {
  context: PicoExplicitContext;
  label?: string;
  className?: string;
}) {
  const ask = usePicoStore((state) => state.ask);
  return <button type="button" className={`ask-pico-button ${className}`.trim()} aria-label={`${label}：${context.title}`} onClick={() => ask(context)}>{label}</button>;
}
