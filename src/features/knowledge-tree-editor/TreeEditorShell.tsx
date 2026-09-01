import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../app/routes';

const SECTIONS = [
  { key: 'structure', label: '结构' },
  { key: 'content', label: '内容' },
  { key: 'questions', label: '题目' },
  { key: 'settings', label: '设置' },
];

export function TreeEditorShell() {
  const navigate = useNavigate();
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();

  return (
    <div className="tree-editor-shell">
      <header className="tree-editor-shell__header">
        <button
          className="tree-editor-shell__back"
          onClick={() => navigate(ROUTES.tree(libraryId ?? '', treeId ?? ''))}
          type="button"
        >
          完成编辑
        </button>
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
