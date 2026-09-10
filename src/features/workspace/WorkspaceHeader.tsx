import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useNavigationSlot, type NavigationSlotName } from '../../components/navigation/navigationSlots';

/** Controls follow the current host while their page owns callbacks and state. */
function NavigationSlot({ name, children }: { name: NavigationSlotName; children: ReactNode }) {
  const host = useNavigationSlot(name);
  return host && children ? createPortal(children, host) : null;
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
      <NavigationSlot name="title"><strong className="context-nav__title" title={title ?? breadcrumbs.at(-1)}>{title ?? breadcrumbs.at(-1)}</strong>{modes}</NavigationSlot>
      <WorkspaceActions primary>{primaryAction}</WorkspaceActions>
      <WorkspaceActions>{actions}</WorkspaceActions>
    </>
  );
}

/** Nested pages can contribute actions without replacing their shell's title. */
export function WorkspaceActions({ children, primary = false }: { children?: ReactNode; primary?: boolean }) {
  return <NavigationSlot name={primary ? 'primary' : 'actions'}>{children}</NavigationSlot>;
}
