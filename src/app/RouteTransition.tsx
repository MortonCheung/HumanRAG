import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** 单实例路由过渡：旧页面立即卸载，避免退场副本截获点击或提交。 */
export function RouteTransition({ routeKey, direction, children }: { routeKey: string; direction: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div key={routeKey}>{children}</div>;
  return (
    <motion.div
      key={routeKey}
      initial="initial"
      animate="animate"
      variants={{
        initial: { opacity: 0.72, x: direction * 42 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
