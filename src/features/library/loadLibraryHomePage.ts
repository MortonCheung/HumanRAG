let libraryPagePromise: ReturnType<typeof importLibraryPage> | null = null;

function importLibraryPage() {
  return import('./pages/LibraryHomePage');
}

/** Share one import promise between the router and goal-tree handoff. */
export function loadLibraryHomePage() {
  libraryPagePromise ??= importLibraryPage().catch((error) => {
    libraryPagePromise = null;
    throw error;
  });
  return libraryPagePromise;
}

export async function loadLibraryHomeRoute() {
  return { Component: (await loadLibraryHomePage()).LibraryHomePage };
}
