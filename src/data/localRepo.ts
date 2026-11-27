import { createStore, del, entries, get, set } from 'idb-keyval';
import { stamp, type CoverChange, type Repository } from './repository';
import { normalizeRecord, type VinylRecord } from './types';

/** Records kept only in this browser's IndexedDB. */
export function createLocalRepo(): Repository {
  const records = createStore('vinyl-records', 'records');
  const covers = createStore('vinyl-covers', 'covers');
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((emit) => emit());

  const write = async (record: VinylRecord, cover: CoverChange) => {
    if (cover === null) await del(record.id, covers);
    else if (cover !== undefined) await set(record.id, cover, covers);
    await set(record.id, record, records);
    changed();
  };

  return {
    kind: 'local',
    key: 'device',
    subscribeRecords(onChange, onError) {
      const emit = () => {
        entries(records)
          .then((all) => onChange(all.map(([, value]) => normalizeRecord(value))))
          .catch(onError);
      };
      listeners.add(emit);
      emit();
      return () => listeners.delete(emit);
    },
    saveRecord: (record, cover) => write(stamp(record, cover), cover),
    putRecord: (record, cover) => write(record, cover),
    async deleteRecord(id) {
      await del(id, records);
      await del(id, covers);
      changed();
    },
    async getCover(id) {
      return (await get<string>(id, covers)) ?? null;
    },
  };
}
