import { forwardRef, useCallback } from 'react';
import { Link, NavLink, useLocation, useNavigate, type LinkProps, type NavLinkProps, type NavigateFunction, type NavigateOptions, type To } from 'react-router-dom';
import { isSpatialEntry } from './routeTransitions';

function canAnimateNavigation(from: string, to: To) {
  const pathname = typeof to === 'string' ? to.split(/[?#]/, 1)[0] : to.pathname;
  return typeof document.startViewTransition === 'function'
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    && Boolean(pathname && pathname !== from && !isSpatialEntry(from, pathname));
}

/** Use the router's public transition option; it also records reverse POPs. */
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps>(function TransitionLink({ to, viewTransition, ...props }, ref) {
  const { pathname } = useLocation();
  return <Link {...props} ref={ref} to={to} viewTransition={viewTransition ?? canAnimateNavigation(pathname, to)} />;
});

export const TransitionNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function TransitionNavLink({ to, viewTransition, ...props }, ref) {
  const { pathname } = useLocation();
  return <NavLink {...props} ref={ref} to={to} viewTransition={viewTransition ?? canAnimateNavigation(pathname, to)} />;
});

export function usePageNavigate(): NavigateFunction {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback((to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') return navigate(to);
    return navigate(to, { viewTransition: canAnimateNavigation(pathname, to), ...options });
  }, [navigate, pathname]) as NavigateFunction;
}
