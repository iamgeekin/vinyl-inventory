import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cloudEnabled } from '../config';
import { createLocalRepo } from '../data/localRepo';
import type { Repository } from '../data/repository';
import { loadSettings, storeSettings } from '../data/settingsStore';
import { defaultSettings, type Settings, type VinylRecord } from '../data/types';
import { isSample, copyToDevice } from '../sync/move';
import type { Session } from '../sync/session';
import { readCode, storeCode } from '../sync/storedCode';

export interface SyncState {
  /** False when this copy of the app was built without a database. */
  available: boolean;
  /** The sync code of the linked collection, or null. */
  code: string | null;
  /** Records saved only on this device, not counting samples. */
  deviceRecords: number;
  /** What syncing is doing or did last, for showing to the user. */
  message: string;
  busy: boolean;
  start: (invite: string) => Promise<void>;
  join: (code: string, bringDeviceRecords: boolean) => Promise<void>;
  moveDeviceRecords: () => Promise<void>;
  stop: () => Promise<void>;
}

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
  sync: SyncState;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp must be used inside AppProvider');
  return state;
}

const loadSync = () => import('../sync/session');
const plural = (n: number) => `${n} ${n === 1 ? 'record' : 'records'}`;

interface ProviderProps {
  children: ReactNode;
  splash: (message: string, onStopSyncing?: () => void) => ReactNode;
}

export function AppProvider({ children, splash }: ProviderProps) {
  const [local] = useState(createLocalRepo);
  const [code, setCode] = useState(() => (cloudEnabled ? readCode() : null));
  const [session, setSession] = useState<Session | null>(null);
  const [startError, setStartError] = useState('');
  const [stored, setStored] = useState<Partial<Settings> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [deviceRecords, setDeviceRecords] = useState(0);

  // Open the linked collection.
  useEffect(() => {
    if (!code || session?.code === code) return;
    let cancelled = false;
    loadSync()
      .then((sync) => sync.openSession(code))
      .then((opened) => !cancelled && setSession(opened))
      .catch(() => !cancelled && setStartError('Could not start syncing. Check your connection and reload.'));
    return () => {
      cancelled = true;
    };
  }, [code, session]);

  useEffect(() => {
    loadSettings()
      .then(setStored)
      .catch((e: Error) => {
        setStored({});
        setError(e.message);
      });
  }, []);

  useEffect(
    () =>
      local.subscribeRecords(
        (records) => setDeviceRecords(records.filter((r) => !isSample(r)).length),
        (e) => setError(e.message),
      ),
    [local],
  );

  const repo = code ? (session?.code === code ? session.repo : null) : local;
  const [snapshot, setSnapshot] = useState<{ repo: Repository; records: VinylRecord[] }>();

  useEffect(() => {
    if (!repo) return;
    return repo.subscribeRecords(
      (records) => setSnapshot({ repo, records }),
      (e) => setError(e.message),
    );
  }, [repo]);

  const current = repo && snapshot?.repo === repo ? snapshot.records : null;

  /** Runs a syncing task, showing its progress and any problem. */
  const task = useCallback(async (label: string, run: () => Promise<string>) => {
    setBusy(true);
    setMessage(label);
    try {
      setMessage(await run());
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const move = async (target: Session) => {
    try {
      const moved = await target.moveFrom(local, (done, total) => setMessage(`Adding record ${done} of ${total}…`));
      return moved ? ` ${plural(moved)} from this device added.` : '';
    } catch (e) {
      return ` Some records are still only on this device: ${(e as Error).message}`;
    }
  };

  const link = (opened: Session) => {
    storeCode(opened.code);
    setSession(opened);
    setCode(opened.code);
  };

  const unlink = () => {
    storeCode(null);
    setCode(null);
    setSession(null);
    setStartError('');
  };

  if (startError && code) return splash(startError, unlink);
  if (!repo) return splash('Opening your collection…');

  const value: AppState = {
    repo,
    records: current ?? [],
    ready: current !== null,
    settings: { ...defaultSettings(), ...stored },
    settingsReady: stored !== null,
    error,
    clearError: () => setError(''),
    saveSettings: (patch) => {
      setStored((previous) => ({ ...previous, ...patch }));
      storeSettings(patch).catch((e: Error) => setError(e.message));
    },
    sync: {
      available: cloudEnabled,
      code,
      deviceRecords,
      message,
      busy,
      start: (invite) =>
        task('Setting up syncing…', async () => {
          const opened = await (await loadSync()).createCollection(invite);
          link(opened);
          return `Syncing is on. Save your sync code somewhere safe.${await move(opened)}`;
        }),
      join: (input, bringDeviceRecords) =>
        task('Looking for the collection…', async () => {
          const opened = await (await loadSync()).joinCollection(input);
          link(opened);
          return `This device is now synced.${bringDeviceRecords ? await move(opened) : ''}`;
        }),
      moveDeviceRecords: () =>
        task('Adding records…', async () => {
          if (!session) return '';
          return (await move(session)).trim();
        }),
      stop: () =>
        task('Copying records to this device…', async () => {
          if (!current) throw new Error('Wait until the collection has loaded, then try again.');
          const missing = await copyToDevice(current, repo, local);
          unlink();
          return `Syncing is off. A copy of ${plural(current.length)} is on this device.${
            missing ? ` ${missing} saved covers could not be copied.` : ''
          }`;
        }),
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
