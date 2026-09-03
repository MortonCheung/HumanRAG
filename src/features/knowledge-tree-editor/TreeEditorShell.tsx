import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../app/routes';
import { migrateV9 } from '../../domain/knowledge/migration';

const SECTIONS = [
  { key: 'structure', label: '节点' },
  { key: 'questions', label: '题目' },
  { key: 'settings', label: '设置' },
];

export function TreeEditorShell() {
  const navigate = useNavigate();
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  const domain = migrateV9();
  const tree = [...domain.trees, ...domain.userTrees].find((candidate) => candidate.id === treeId);

  return (
    <div className="tree-editor-shell">
      <header className="tree-editor-shell__header">
        <button
          className="tree-editor-shell__back"
          onClick={() => navigate(ROUTES.tree(libraryId ?? '', treeId ?? ''))}
          type="button"
        >
          ← 完成
        </button>
        <strong className="tree-editor-shell__title">{tree?.name ?? '知识树'}</strong>
        <nav className="tree-editor-shell__nav">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.key}
              to={ROUTES.treeEdit(libraryId ?? '', treeId ?? '', s.key)}
              className={({ isActive }) =>
                `tree-editor-shell__nav-link${isActive ? ' tree-editor-shell__nav-link--active' : ''}`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="tree-editor-shell__content">
        <Outlet />
      </div>
    </div>
  );
}
