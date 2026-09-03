import type { ReactNode } from 'react';

export interface WorkspaceHeaderProps {
  breadcrumbs: string[];
  onBack: () => void;
  title?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function WorkspaceHeader({ breadcrumbs, onBack, title, backLabel = '返回', actions }: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <button
        className="workspace-header__back"
        onClick={() => onBack()}
        type="button"
      >
        ← {backLabel}
      </button>
      <strong className="workspace-header__title">{title ?? breadcrumbs.at(-1)}</strong>
      <nav className="workspace-header__breadcrumbs" aria-label="当前位置">
        {breadcrumbs.map((crumb, index) => (
          <span key={index}>
            {index > 0 && <span className="workspace-header__sep"> / </span>}
            <span className="workspace-header__crumb">{crumb}</span>
          </span>
        ))}
      </nav>
      <div className="workspace-header__actions">{actions}</div>
    </header>
  );
}
