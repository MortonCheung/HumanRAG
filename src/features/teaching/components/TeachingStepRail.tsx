import type { TeachingStepKind } from '../../../data/v6/schemas/teachingSchema';
import { useTeachingStore } from '../../../store/teachingStore';
import { contentRepository } from '../../../services/content/ContentRepository';
import { motion, useReducedMotion } from 'motion/react';
import { MOTION } from '../../../motion/tokens';

const PHASES: Array<{ label: string; kinds: TeachingStepKind[] }> = [
  { label: '诊断', kinds: ['objective', 'diagnostic'] },
  { label: '理解', kinds: ['explanation', 'remediation'] },
  { label: '示范', kinds: ['worked-example'] },
  { label: '尝试', kinds: ['guided-practice'] },
  { label: '独立验证', kinds: ['independent-check', 'summary'] },
];

export function teachingPhaseIndex(kind?: TeachingStepKind): number {
  return Math.max(0, PHASES.findIndex((phase) => kind && phase.kinds.includes(kind)));
}

export function TeachingStepRail() {
  const reducedMotion = Boolean(useReducedMotion());
  const unitId = useTeachingStore((state) => state.unitId);
  const currentStepId = useTeachingStore((state) => state.currentStepId);
  const completedStepIds = useTeachingStore((state) => state.completedStepIds);
  const unit = unitId ? contentRepository.getTeachingUnit(unitId) : undefined;
  if (!unit) return null;
  const current = currentStepId ? contentRepository.getTeachingStep(currentStepId) : undefined;
  const currentPhase = teachingPhaseIndex(current?.kind);

  return <nav className="step-rail" aria-label="带我学的五个阶段">
    <span className="step-rail__line" aria-hidden />
    {PHASES.map((phase, index) => {
      const phaseStepIds = unit.stepIds.filter((stepId) => {
        const step = contentRepository.getTeachingStep(stepId);
        return step ? phase.kinds.includes(step.kind) : false;
      });
      const isCurrent = index === currentPhase;
      const isDone = index < currentPhase || (phaseStepIds.length > 0 && phaseStepIds.every((stepId) => completedStepIds.includes(stepId)));
      return <div key={phase.label} className={`step-rail__item ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
        {isCurrent && <motion.span className="step-rail__active-marker" layoutId="teaching-phase-active" aria-hidden transition={reducedMotion ? { duration: 0 } : MOTION.spring.soft} />}
        <span className="step-rail__dot" aria-hidden />
        <span><span className="step-rail__index">0{index + 1}</span><span className="step-rail__label">{phase.label}</span></span>
      </div>;
    })}
  </nav>;
}
