/** Decoded during the landing, so crossing into the workspace never loads its UI mid-shot. */
export const loadUniversePage = () => import('./pages/UniversePage').then((module) => ({ default: module.UniversePage }));
