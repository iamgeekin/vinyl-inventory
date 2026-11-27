import { createStore, get, update } from 'idb-keyval';
import type { Settings } from './types';

// Settings belong to the device and are never synced, so each person's Discogs
// token and appearance stay their own even in a shared collection.
let store: ReturnType<typeof createStore> | undefined;
const settings = () => (store ??= createStore('vinyl-settings', 'settings'));

export const loadSettings = async (): Promise<Partial<Settings>> =>
  (await get<Partial<Settings>>('app', settings())) ?? {};

export const storeSettings = (patch: Partial<Settings>) =>
  update<Partial<Settings>>('app', (current) => ({ ...current, ...patch }), settings());
