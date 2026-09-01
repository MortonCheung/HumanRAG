import { NavLink, useParams } from 'react-router-dom';
import { ROUTES } from '../../../app/routes';

export function TreeLocalNav() {
  const { libraryId, treeId } = useParams<{ libraryId: string; treeId: string }>();
  if (!libraryId || !treeId) return null;

  const tree = ROUTES.tree(libraryId, treeId);
  const learn = ROUTES.treeLearn(libraryId, treeId);
  const practice = ROUTES.treePractice(libraryId, treeId);

  return (
    <nav className="tree-local-nav" aria-label="知识树导航">
      <NavLink
        to={tree}
        end
        className={({ isActive }) => `tree-local-nav__link${isActive ? ' tree-local-nav__link--active' : ''}`}
      >
        总览
      </NavLink>
      <NavLink
        to={learn}
        className={({ isActive }) => `tree-local-nav__link${isActive ? ' tree-local-nav__link--active' : ''}`}
      >
        学习
      </NavLink>
      <NavLink
        to={practice}
        className={({ isActive }) => `tree-local-nav__link${isActive ? ' tree-local-nav__link--active' : ''}`}
      >
        题库
      </NavLink>
    </nav>
  );
}
