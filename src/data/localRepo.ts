import { createStore, del, entries, get, set } from 'idb-keyval';
import { stamp, type CoverChange, type Repository } from './repository';
import { normalizeRecord, type Settings, type VinylRecord } from './types';

/** Demo mode: everything stays in this browser's IndexedDB. */
export function createLocalRepo(): Repository {
  const records = createStore('vinyl-records', 'records');
  const covers = createStore('vinyl-covers', 'covers');
  const settings = createStore('vinyl-settings', 'settings');

  const recordListeners = new Set<() => void>();
  const settingsListeners = new Set<() => void>();

  return {
    kind: 'local',
    subscribeRecords(onChange, onError) {
      const emit = () => {
        entries(records)
          .then((all) => onChange(all.map(([, value]) => normalizeRecord(value))))
          .catch(onError);
      };
      recordListeners.add(emit);
      emit();
      return () => recordListeners.delete(emit);
    },
    subscribeSettings(onChange, onError) {
      const emit = () => {
        get<Partial<Settings>>('app', settings)
          .then((value) => onChange(value ?? {}))
          .catch(onError);
      };
      settingsListeners.add(emit);
      emit();
      return () => settingsListeners.delete(emit);
    },
    async saveRecord(record: VinylRecord, cover: CoverChange) {
      if (cover === null) await del(record.id, covers);
      else if (cover !== undefined) await set(record.id, cover, covers);
      await set(record.id, stamp(record, cover), records);
      recordListeners.forEach((emit) => emit());
    },
    async deleteRecord(id) {
      await del(id, records);
      await del(id, covers);
      recordListeners.forEach((emit) => emit());
    },
    async getCover(id) {
      return (await get<string>(id, covers)) ?? null;
    },
    async saveSettings(patch) {
      const current = (await get<Partial<Settings>>('app', settings)) ?? {};
      await set('app', { ...current, ...patch }, settings);
      settingsListeners.forEach((emit) => emit());
    },
  };
}
