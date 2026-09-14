import { MorphIcon } from 'morphicons/react';
import { ChevronDown, ChevronRight } from 'lucide';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { MOTION } from '../../../motion/tokens';
import type { KnowledgePoint } from '../../../domain/knowledge/types';

interface PointGroupProps {
  group: { id: string; name: string; points: KnowledgePoint[] };
  defaultOpen: boolean;
  forceOpen: boolean;
  children: (point: KnowledgePoint) => ReactNode;
}

export function PointGroup({ group, defaultOpen, forceOpen, children }: PointGroupProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen || forceOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <section className="point-group" aria-label={group.name}>
      <button className="point-group__header" type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((value) => !value)}>
        <span>{group.name}</span>
        <MorphIcon icon={open ? ChevronDown : ChevronRight} size={15} strokeWidth={1.8} spring="snappy" reducedMotion="user" />
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.ul
          id={contentId}
          initial={reducedMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: reducedMotion ? 0 : MOTION.duration.content, ease: MOTION.ease.out }}
        >{group.points.map((point) => children(point))}</motion.ul>}
      </AnimatePresence>
    </section>
  );
}
