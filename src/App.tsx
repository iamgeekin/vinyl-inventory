import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { RecordMenuProvider } from './components/RecordMenu';
import { TabBar } from './components/TabBar';
import { Add } from './pages/Add';
import { Discogs } from './pages/Discogs';
import { EditRecord } from './pages/EditRecord';
import { RecordDetail } from './pages/RecordDetail';
import { Search } from './pages/Search';
import { Settings } from './pages/Settings';
import { Shelf } from './pages/Shelf';
import { Stats } from './pages/Stats';
import { AppProvider, useApp } from './state/AppContext';
import { useTheme } from './theme/ThemeContext';
import { PHONE_LANDSCAPE, useMediaQuery } from './theme/useMediaQuery';

/** How a newly opened screen arrives: from the side, or up from below for a form. */
function entrance(pathname: string): string {
  if (pathname === '/new' || pathname.endsWith('/edit')) return 'sheet';
  return /^\/(record\/|settings|discogs)/.test(pathname) ? 'push' : '';
}

function Layout() {
  const { pathname } = useLocation();
  // Only on the way in: going back is left to the phone, which animates its own swipe.
  const opened = useNavigationType() === 'PUSH';
  const { error, clearError, records, settings, settingsReady } = useApp();
  const { setAppearance } = useTheme();
  const sideways = useMediaQuery(PHONE_LANDSCAPE);
  // The record page, the form and the sideways slider use the full height.
  const showTabs = !/^\/(new|record\/)/.test(pathname) && !(sideways && pathname === '/' && records.length > 0);

  useEffect(() => {
    if (settingsReady) setAppearance(settings.appearance);
  }, [settingsReady, settings.appearance, setAppearance]);

  useEffect(() => {
    document.querySelector('.screen')?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={showTabs ? 'app has-tabs' : 'app'}>
      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" className="link" onClick={clearError}>Dismiss</button>
        </div>
      )}
      <main>
        <div key={pathname} className="route" data-enter={opened ? entrance(pathname) : ''}>
          <Routes>
            <Route path="/" element={<Shelf />} />
            <Route path="/search" element={<Search />} />
            <Route path="/add" element={<Add />} />
            <Route path="/new" element={<EditRecord />} />
            <Route path="/record/:id" element={<RecordDetail />} />
            <Route path="/record/:id/edit" element={<EditRecord />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/discogs" element={<Discogs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      {showTabs && <TabBar />}
    </div>
  );
}

export function App() {
  return (
    <AppProvider
      splash={(message, onStopSyncing) => (
        <div className="app">
          <div className="empty">
            <p className="muted" role="status">{message}</p>
            {onStopSyncing && (
              <button type="button" className="button" onClick={onStopSyncing}>Use this device without syncing</button>
            )}
          </div>
        </div>
      )}
    >
      <HashRouter>
        <RecordMenuProvider>
          <Layout />
        </RecordMenuProvider>
      </HashRouter>
    </AppProvider>
  );
}
