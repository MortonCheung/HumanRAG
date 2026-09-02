export interface WorkspaceHeaderProps {
  breadcrumbs: string[];
  onBack: () => void;
}

export function WorkspaceHeader({ breadcrumbs, onBack }: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <button
        className="workspace-header__back"
        onClick={() => onBack()}
        type="button"
      >
        ← 返回
      </button>
      <nav className="workspace-header__breadcrumbs" aria-label="面包屑">
        {breadcrumbs.map((crumb, index) => (
          <span key={index}>
            {index > 0 && <span className="workspace-header__sep"> / </span>}
            <span className="workspace-header__crumb">{crumb}</span>
          </span>
        ))}
      </nav>
    </header>
  );
}
