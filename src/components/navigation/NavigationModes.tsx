import { useLocation } from 'react-router-dom';
import { TransitionNavLink as NavLink, usePageNavigate as useNavigate } from '../../app/pageNavigation';

export interface NavigationMode { to: string; label: string }

export function NavigationModes({ label, items }: { label: string; items: NavigationMode[] }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const selected = items.find((item) => item.to === pathname)?.to ?? items[0]?.to;
  return (
    <div className="context-nav__modes">
      <nav className="context-nav__mode-links" aria-label={label}>{items.map((item) => <NavLink key={item.to} to={item.to} end>{item.label}</NavLink>)}</nav>
      <select className="context-nav__mode-select" aria-label={label} value={selected} onChange={(event) => navigate(event.target.value)}>{items.map((item) => <option key={item.to} value={item.to}>{item.label}</option>)}</select>
    </div>
  );
}
