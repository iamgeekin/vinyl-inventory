import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cloudEnabled } from '../config';
import { createLocalRepo } from '../data/localRepo';
import type { Repository } from '../data/repository';
import { defaultSettings, type Settings, type VinylRecord } from '../data/types';
import type { CloudSession } from '../firebase';

interface AppState {
  repo: Repository;
  records: VinylRecord[];
  settings: Settings;
  /** False until the stored settings have arrived; `settings` holds defaults until then. */
  settingsReady: boolean;
  /** False until the first list of records has arrived. */
  ready: boolean;
  error: string;
  clearError: () => void;
  saveSettings: (patch: Partial<Settings>) => void;
  session: CloudSession | null;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp must be used inside AppProvider');
  return state;
}

interface ProviderProps {
  children: ReactNode;
  /** Shown while signed out in cloud mode. */
  signIn: () => ReactNode;
  splash: (message: string) => ReactNode;
}

export function AppProvider({ children, signIn, splash }: ProviderProps) {
  // undefined: still starting up. null: signed out.
  const [session, setSession] = useState<CloudSession | null | undefined>(cloudEnabled ? undefined : null);
  const [localRepo] = useState(() => (cloudEnabled ? null : createLocalRepo()));
  const [startError, setStartError] = useState('');

  useEffect(() => {
    if (!cloudEnabled) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    import('../firebase')
      .then((firebase) => {
        if (!cancelled) stop = firebase.watchSession(setSession);
      })
      .catch(() => setStartError('Could not start the sign-in service. Check your connection and reload.'));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const repo = cloudEnabled ? (session?.repo ?? null) : localRepo;

  if (startError) return splash(startError);
  if (cloudEnabled && session === undefined) return splash('Opening your collection…');
  if (!repo) return signIn();
  return (
    <Collection key={session?.uid ?? 'local'} repo={repo} session={session ?? null}>
      {children}
    </Collection>
  );
}

function Collection({ repo, session, children }: { repo: Repository; session: CloudSession | null; children: ReactNode }) {
  const [records, setRecords] = useState<VinylRecord[] | null>(null);
  const [stored, setStored] = useState<Partial<Settings> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const report = (e: Error) => setError(e.message);
    const stopRecords = repo.subscribeRecords(setRecords, report);
    const stopSettings = repo.subscribeSettings(setStored, report);
    return () => {
      stopRecords();
      stopSettings();
    };
  }, [repo]);

  const value = useMemo<AppState>(() => {
    const settings = { ...defaultSettings(), ...stored };
    return {
      repo,
      session,
      records: records ?? [],
      ready: records !== null,
      settings,
      settingsReady: stored !== null,
      error,
      clearError: () => setError(''),
      saveSettings: (patch) => {
        setStored((current) => ({ ...current, ...patch }));
        repo.saveSettings(patch).catch((e: Error) => setError(e.message));
      },
    };
  }, [repo, session, records, stored, error]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
