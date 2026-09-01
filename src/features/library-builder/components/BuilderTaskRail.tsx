import { BUILDER_STEPS, type BuilderStep } from '../types';

/** 左侧五任务入口（蓝图 §11.3）。 */
export function BuilderTaskRail({
  active,
  enabled,
  onSelect,
}: {
  active: BuilderStep;
  enabled: Record<BuilderStep, boolean>;
  onSelect: (step: BuilderStep) => void;
}) {
  return (
    <nav className="builder-rail" aria-label="创建步骤">
      {BUILDER_STEPS.map((step, index) => {
        const isEnabled = enabled[step.id];
        return (
          <button
            key={step.id}
            type="button"
            className={`builder-rail__item${active === step.id ? ' is-active' : ''}`}
            disabled={!isEnabled}
            onClick={() => isEnabled && onSelect(step.id)}
          >
            <span className="builder-rail__index">{index + 1}</span>
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
