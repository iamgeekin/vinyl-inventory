import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { Add } from './pages/Add';
import { EditRecord } from './pages/EditRecord';
import { RecordDetail } from './pages/RecordDetail';
import { Search } from './pages/Search';
import { Settings } from './pages/Settings';
import { Shelf } from './pages/Shelf';
import { SignIn } from './pages/SignIn';
import { Stats } from './pages/Stats';
import { AppProvider, useApp } from './state/AppContext';
import { useTheme } from './theme/ThemeContext';
import { PHONE_LANDSCAPE, useMediaQuery } from './theme/useMediaQuery';

function Layout() {
  const { pathname } = useLocation();
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
    <div className="app">
      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" className="link" onClick={clearError}>Dismiss</button>
        </div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<Shelf />} />
          <Route path="/search" element={<Search />} />
          <Route path="/add" element={<Add />} />
          <Route path="/new" element={<EditRecord />} />
          <Route path="/record/:id" element={<RecordDetail />} />
          <Route path="/record/:id/edit" element={<EditRecord />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showTabs && <TabBar />}
    </div>
  );
}

export function App() {
  return (
    <AppProvider
      signIn={() => <SignIn />}
      splash={(message) => (
        <div className="app">
          <p className="empty muted" role="status">{message}</p>
        </div>
      )}
    >
      <HashRouter>
        <Layout />
      </HashRouter>
    </AppProvider>
  );
}
