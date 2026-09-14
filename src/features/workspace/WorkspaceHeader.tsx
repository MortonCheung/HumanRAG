import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useNavigationSlot, type NavigationSlotName } from '../../components/navigation/navigationSlots';

/** Controls follow the current host while their page owns callbacks and state. */
function NavigationSlot({ name, children }: { name: NavigationSlotName; children: ReactNode }) {
  const host = useNavigationSlot(name);
  return host && children ? createPortal(children, host) : null;
}

/** Only the title itself fades in; the bar, logo, and buttons stay put. */
function AnimatedNavigationTitle({ title }: { title: string }) {
  const reducedMotion = Boolean(useReducedMotion());
  return (
    <motion.strong
      key={title}
      className="context-nav__title"
      title={title}
      initial={reducedMotion ? false : { opacity: 0, filter: 'blur(4px)', color: 'var(--it-accent)' }}
      animate={{ opacity: 1, filter: 'blur(0px)', color: 'var(--it-text)' }}
      transition={{ duration: reducedMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
    >
      {title}
    </motion.strong>
  );
}

export interface WorkspaceHeaderProps {
  breadcrumbs?: string[];
  onBack?: () => void;
  title?: string;
  backLabel?: string;
  modes?: ReactNode;
  actions?: ReactNode;
  primaryAction?: ReactNode;
}

/** Page configuration, not a second header. Keep controls in their owning page. */
export function WorkspaceHeader({ breadcrumbs = [], onBack, title, backLabel = '返回', modes, actions, primaryAction }: WorkspaceHeaderProps) {
  return (
    <>
      {onBack && <NavigationSlot name="back"><button className="context-nav__button context-nav__back" onClick={onBack} type="button" aria-label={backLabel} title={backLabel}><ArrowLeft size={18} aria-hidden="true" /><span>{backLabel}</span></button></NavigationSlot>}
      <NavigationSlot name="title"><AnimatedNavigationTitle title={title ?? breadcrumbs.at(-1) ?? ''} />{modes}</NavigationSlot>
      <WorkspaceActions primary>{primaryAction}</WorkspaceActions>
      <WorkspaceActions>{actions}</WorkspaceActions>
    </>
  );
}

/** Nested pages can contribute actions without replacing their shell's title. */
export function WorkspaceActions({ children, primary = false }: { children?: ReactNode; primary?: boolean }) {
  return <NavigationSlot name={primary ? 'primary' : 'actions'}>{children}</NavigationSlot>;
}
