import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** 路由过渡（蓝图 §4.4）：新页面 360ms 淡入上移，旧页面 180ms 淡出。 */
export function RouteTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div key={routeKey}>{children}</div>;
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
