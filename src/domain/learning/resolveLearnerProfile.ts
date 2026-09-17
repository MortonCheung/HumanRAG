import type { LearnerProfile } from '../../data/v6/schemas/progressSchema';
import type { LearnerProfileOverride } from '../../store/userStore';

function resolvedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

/** Resolve editable display fields without ever changing the learner's identity or history key. */
export function resolveLearnerProfile(base: LearnerProfile, override?: LearnerProfileOverride): LearnerProfile {
  return {
    ...base,
    name: resolvedValue(override?.name, base.name),
    major: resolvedValue(override?.major, base.major),
    identity: resolvedValue(override?.identity, base.identity),
    goal: resolvedValue(override?.goal, base.goal),
  };
}
