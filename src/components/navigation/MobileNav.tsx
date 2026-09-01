import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowCounterClockwise, Books, House, NotePencil, Notebook, Path, SquaresFour, X } from '@phosphor-icons/react';
import { ROUTES } from '../../app/routes';
import { useUiStore } from '../../store/uiStore';
import { resetDemoData } from '../../services/resetDemoData';

const ITEMS = [
  { to: ROUTES.universe, label: '知识空间', icon: <Path size={19} weight="regular" /> },
  { to: ROUTES.teach, label: '教学', icon: <SquaresFour size={19} weight="regular" /> },
  { to: ROUTES.practice, label: '刷题', icon: <NotePencil size={19} weight="regular" /> },
  { to: ROUTES.library, label: '知识库', icon: <Books size={19} weight="regular" /> },
  { to: ROUTES.progress, label: '学习记录', icon: <Notebook size={19} weight="regular" /> },
] as const;

export function MobileNav() {
  const open = useUiStore((state) => state.mobileMenuOpen);
  const setOpen = useUiStore((state) => state.setMobileMenuOpen);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="mobile-nav-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.nav
            className="mobile-nav"
            aria-label="移动端菜单"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            <button onClick={() => setOpen(false)} aria-label="关闭菜单" style={{ alignSelf: 'flex-end', width: 40, height: 40, display: 'grid', placeItems: 'center', color: 'var(--it-text-faint)' }}>
              <X size={18} />
            </button>
            <p className="mobile-nav__title">ITEACH</p>
            {ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                setOpen(false);
              }}
              aria-label="重置演示数据"
            >
              <ArrowCounterClockwise size={19} weight="regular" />
              <span>重置演示数据</span>
            </button>
            <div className="mobile-nav__footer">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <House size={13} /> 本地演示 · 数据保存在浏览器
              </span>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
