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
        initial: { opacity: 0, x: direction * 18, y: 4, filter: 'blur(3px)' },
        animate: { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
