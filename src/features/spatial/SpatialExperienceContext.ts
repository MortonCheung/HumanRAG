import { createContext, useContext } from 'react';
import type { SceneModel } from '../../graph/types';

export type SpatialExperiencePhase = 'landing' | 'entering' | 'universe';

interface SpatialExperienceValue {
  phase: SpatialExperiencePhase;
  model: SceneModel;
  beginUniverseEntry: () => void;
}

export const SpatialExperienceContext = createContext<SpatialExperienceValue | null>(null);

export function useSpatialExperience() {
  const value = useContext(SpatialExperienceContext);
  if (!value) throw new Error('useSpatialExperience 必须在 SpatialExperienceShell 内使用');
  return value;
}
