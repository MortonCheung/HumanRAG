import { useTeachingStore } from '../../../store/teachingStore';
import { contentRepository } from '../../../services/content/ContentRepository';

const STEP_KIND_LABELS: Record<string, string> = {
  objective: '学习目标',
  diagnostic: '前置诊断',
  explanation: '概念讲解',
  'worked-example': '教师示范',
  'guided-practice': '引导练习',
  'independent-check': '独立检查',
  remediation: '纠错复教',
  summary: '总结确认',
};

export function TeachingStepRail() {
  const unitId = useTeachingStore((state) => state.unitId);
  const currentStepId = useTeachingStore((state) => state.currentStepId);
  const completedStepIds = useTeachingStore((state) => state.completedStepIds);
  const goToStep = useTeachingStore((state) => state.goToStep);
  const unit = unitId ? contentRepository.getTeachingUnit(unitId) : undefined;
  if (!unit) return null;

  const minutesPerStep = Math.max(1, Math.round(unit.estimatedMinutes / unit.stepIds.length));

  return (
    <nav className="step-rail" aria-label="教学步骤">
      <span className="step-rail__line" aria-hidden />
      {unit.stepIds.map((stepId) => {
        const step = contentRepository.getTeachingStep(stepId);
        if (!step) return null;
        const isCurrent = stepId === currentStepId;
        const isDone = completedStepIds.includes(stepId);
        const reachable = isDone || isCurrent;
        const classes = [
          'step-rail__item',
          isCurrent ? 'is-current' : '',
          isDone ? 'is-done' : '',
          reachable ? 'is-reachable' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={stepId}
            type="button"
            className={classes}
            disabled={!reachable}
            onClick={() => goToStep(stepId)}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="step-rail__dot" aria-hidden />
            <span>
              <span className="step-rail__label">{STEP_KIND_LABELS[step.kind] ?? step.title}</span>
              <span className="step-rail__minutes">约 {minutesPerStep} 分钟</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
