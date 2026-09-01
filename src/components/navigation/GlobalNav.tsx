import { NavLink } from 'react-router-dom';
import { BookOpenText, MagnifyingGlass, Notebook, SquaresFour } from '@phosphor-icons/react';
import { BrandMark } from '../BrandMark';
import { ROUTES } from '../../app/routes';
import { useUiStore } from '../../store/uiStore';

const NAV_ITEMS = [
  { to: ROUTES.universe, label: '知识空间' },
  { to: ROUTES.library, label: '知识库' },
] as const;

export function GlobalNav() {
  const openSearch = useUiStore((state) => state.openSearch);
  const setMobileMenuOpen = useUiStore((state) => state.setMobileMenuOpen);
  return (
    <header className="global-nav" role="banner">
      <NavLink to={ROUTES.universe} className="global-nav__brand" aria-label="iTeach 首页">
        <BrandMark />
      </NavLink>
      <nav className="global-nav__links" aria-label="一级导航">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="global-nav__tools">
        <button className="nav-tool" onClick={openSearch} aria-label="搜索">
          <MagnifyingGlass size={16} weight="regular" />
          <span className="nav-tool--label">搜索</span>
        </button>
        <NavLink to={ROUTES.progress} className="nav-tool nav-tool--label" aria-label="学习记录">
          <Notebook size={16} weight="regular" />
          <span>学习记录</span>
        </NavLink>
        <NavLink to={ROUTES.progress} className="nav-avatar" aria-label="学习者画像">
          <SquaresFour size={15} weight="regular" />
        </NavLink>
        <button
          className="nav-tool nav-tool--icon global-nav__burger"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="打开菜单"
        >
          <BookOpenText size={16} weight="regular" />
        </button>
      </div>
    </header>
  );
}
