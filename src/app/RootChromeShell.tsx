import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalNav } from '../components/navigation/GlobalNav';
import { SpatialViewportProvider } from '../features/spatial/SpatialViewport';
import { AppHistoryProvider } from './appHistory';
import { ROUTES } from './routes';
import { usePicoStore } from '../features/pico/picoStore';

const LazyPicoDock = lazy(() => import('../features/pico/PicoDock'));

interface ChromeVisibilityValue {
  revealOpeningChrome: (locationKey: string) => void;
}

const ChromeVisibilityContext = createContext<ChromeVisibilityValue>({
  revealOpeningChrome: () => undefined,
});

/** One application chrome and one viewport contract survive every route change. */
export function RootChromeShell() {
  const location = useLocation();
  const [revealedOpeningKey, setRevealedOpeningKey] = useState<string | null>(null);
  const revealOpeningChrome = useCallback((locationKey: string) => {
    setRevealedOpeningKey((current) => current === locationKey ? current : locationKey);
  }, []);
  const visibility = useMemo(() => ({ revealOpeningChrome }), [revealOpeningChrome]);
  const concealed = location.pathname === ROUTES.root && revealedOpeningKey !== location.key;
  const picoOpen = usePicoStore((state) => state.open);
  const picoVisible = location.pathname !== ROUTES.tutor;

  return (
    <AppHistoryProvider>
      <SpatialViewportProvider>
        <ChromeVisibilityContext.Provider value={visibility}>
          <GlobalNav concealed={concealed} />
          <div className="root-workspace" data-pico-open={(picoVisible && picoOpen) || undefined}>
            <div className="root-workspace__route"><Outlet /></div>
            {picoVisible && <Suspense fallback={null}><LazyPicoDock /></Suspense>}
          </div>
        </ChromeVisibilityContext.Provider>
      </SpatialViewportProvider>
    </AppHistoryProvider>
  );
}

export function useChromeVisibility() {
  return useContext(ChromeVisibilityContext);
}
