import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** One live Outlet. Native transitions animate inert images of the old/new page. */
export function RouteTransition({ routeKey, direction, children }: { routeKey: string; direction: number; children: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (typeof document.startViewTransition === 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Older browsers keep the same component tree and receive a light entry.
    const animation = page.current?.animate?.([
      { opacity: 0.82, transform: `translate3d(${direction * 24}px, 0, 0)` },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
    return () => animation?.cancel();
  }, [routeKey]);
  return <div ref={page} className="route-page">{children}</div>;
}
