import type { CoverChange, Repository } from '../data/repository';
import { stamp } from '../data/repository';
import { normalizeRecord, type VinylRecord } from '../data/types';
import type { Kind, StoredItem, SyncBackend, Write } from './backend';
import { seal, unseal, type Vault } from './crypto';

interface CoverItem {
  dataUrl: string;
  version: number;
}

const label = (kind: Kind, id: string) => `${kind}/${id}`;
const fingerprint = (item: StoredItem) => item.sealed.iv.join('.');

export async function decodeRecord(vault: Vault, item: StoredItem): Promise<VinylRecord> {
  const value = await unseal(vault.key, label('records', item.id), item.sealed);
  return normalizeRecord({ ...(value as object), id: item.id });
}

/** A collection shared through the database, encrypted with the sync code. */
export function createSyncRepo(backend: SyncBackend, vault: Vault): Repository {
  const errorListeners = new Set<(e: Error) => void>();
  const report = (e: Error) => errorListeners.forEach((listener) => listener(e));
  // Writes are prepared one after another, so they reach the database in order.
  let queue: Promise<unknown> = Promise.resolve();

  async function prepare(record: VinylRecord, cover: CoverChange): Promise<Write[]> {
    const writes: Write[] = [
      { kind: 'records', id: record.id, sealed: await seal(vault.key, label('records', record.id), record) },
    ];
    if (cover === null) writes.push({ kind: 'covers', id: record.id, sealed: null });
    else if (cover !== undefined) {
      const item: CoverItem = { dataUrl: cover, version: record.coverVersion };
      writes.push({ kind: 'covers', id: record.id, sealed: await seal(vault.key, label('covers', record.id), item) });
    }
    return writes;
  }

  /** Resolves once the change is queued; `accepted` settles when the server has it. */
  function send(build: () => Promise<Write[]>) {
    let accepted: Promise<void> = Promise.resolve();
    const queued = queue.then(async () => {
      accepted = backend.write(vault.id, await build());
      accepted.catch((e: Error) => report(new Error(`Not saved to the synced collection: ${e.message}`)));
    });
    queue = queued.catch(() => {});
    return { queued, accepted: queued.then(() => accepted) };
  }

  const readCover = async (id: string, from: 'cache' | 'server') => {
    const sealed = await backend.read(vault.id, 'covers', id, from);
    return sealed ? ((await unseal(vault.key, label('covers', id), sealed)) as CoverItem) : null;
  };

  return {
    kind: 'synced',
    key: vault.id,
    subscribeRecords(onChange, onError) {
      // Unchanged items are not decrypted again.
      const known = new Map<string, { print: string; record: VinylRecord }>();
      let latest = 0;
      let live = true;
      errorListeners.add(onError);
      const stop = backend.watch(
        vault.id,
        'records',
        async (items) => {
          const turn = ++latest;
          let unreadable = 0;
          const records = await Promise.all(
            items.map(async (item) => {
              const print = fingerprint(item);
              const cached = known.get(item.id);
              if (cached?.print === print) return cached.record;
              try {
                const record = await decodeRecord(vault, item);
                known.set(item.id, { print, record });
                return record;
              } catch {
                unreadable += 1;
                return null;
              }
            }),
          );
          // A newer list may have arrived while this one was being decrypted.
          if (!live || turn !== latest) return;
          onChange(records.filter((r): r is VinylRecord => r !== null));
          if (unreadable) onError(new Error(`${unreadable} synced records could not be read.`));
        },
        onError,
      );
      return () => {
        live = false;
        errorListeners.delete(onError);
        stop();
      };
    },
    saveRecord(record, cover) {
      const saved = stamp(record, cover);
      return send(() => prepare(saved, cover)).queued;
    },
    putRecord(record, cover) {
      return send(() => prepare(record, cover)).accepted;
    },
    deleteRecord(id) {
      return send(async () => [
        { kind: 'records', id, sealed: null },
        { kind: 'covers', id, sealed: null },
      ]).queued;
    },
    async getCover(id, version) {
      const cached = await readCover(id, 'cache').catch(() => null);
      if (cached?.version === version) return cached.dataUrl;
      return (await readCover(id, 'server'))?.dataUrl ?? null;
    },
  };
}
