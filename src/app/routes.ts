export const ROUTES = {
  root: '/',
  universe: '/universe',
  teach: '/teach',
  teachUnit: (unitId: string) => `/teach/${unitId}`,
  practice: '/practice',
  practiceSession: (sessionId: string) => `/practice/session/${sessionId}`,
  library: '/library',
  libraryNew: '/library/new',
  libraryDetail: (libraryId: string) => `/library/${libraryId}`,
  libraryEdit: (libraryId: string) => `/library/${libraryId}/edit`,
  progress: '/progress',
} as const;
