import { describe, expect, it } from 'vitest';
import type { Repository } from '../src/data/repository';
import { sampleRecords } from '../src/data/sample';
import { emptyRecord, type VinylRecord } from '../src/data/types';
import { SyncError, type Kind, type StoredItem, type SyncBackend } from '../src/sync/backend';
import { formatCode, generateCode, normalizeCode } from '../src/sync/code';
import { deriveVault, seal, unseal, type Sealed } from '../src/sync/crypto';
import { copyToDevice, listRecords, moveToSynced } from '../src/sync/move';
import { createSyncRepo } from '../src/sync/syncRepo';

/** An in-memory database that behaves like the real one as far as the app can tell. */
function fakeBackend() {
  const items = new Map<string, Sealed>();
  const watchers = new Set<() => void>();
  const prefix = (vault: string, kind: Kind) => `${vault}/${kind}/`;
  const listNow = (vault: string, kind: Kind): StoredItem[] =>
    [...items]
      .filter(([path]) => path.startsWith(prefix(vault, kind)))
      .map(([path, sealed]) => ({ id: path.slice(prefix(vault, kind).length), sealed }));
  const state = { items, failWrites: false };
  const backend: SyncBackend = {
    createVault: async () => {},
    vaultExists: async () => true,
    watch(vault, kind, onItems) {
      const emit = () => onItems(listNow(vault, kind));
      watchers.add(emit);
      emit();
      return () => watchers.delete(emit);
    },
    list: async (vault, kind) => listNow(vault, kind),
    read: async (vault, kind, id) => items.get(prefix(vault, kind) + id) ?? null,
    async write(vault, writes) {
      if (state.failWrites) throw new SyncError('offline');
      for (const w of writes) {
        if (w.sealed) items.set(prefix(vault, w.kind) + w.id, w.sealed);
        else items.delete(prefix(vault, w.kind) + w.id);
      }
      watchers.forEach((emit) => emit());
    },
  };
  return { backend, state };
}

function memoryRepo(): Repository {
  const records = new Map<string, VinylRecord>();
  const covers = new Map<string, string>();
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((l) => l());
  const put = async (record: VinylRecord, cover: string | null | undefined) => {
    if (cover === null) covers.delete(record.id);
    else if (cover !== undefined) covers.set(record.id, cover);
    records.set(record.id, record);
    changed();
  };
  return {
    kind: 'local',
    key: 'memory',
    subscribeRecords(onChange) {
      const emit = () => onChange([...records.values()]);
      listeners.add(emit);
      queueMicrotask(emit);
      return () => listeners.delete(emit);
    },
    saveRecord: put,
    putRecord: put,
    async deleteRecord(id) {
      records.delete(id);
      covers.delete(id);
      changed();
    },
    getCover: async (id) => covers.get(id) ?? null,
  };
}

const record = (title: string, change: Partial<VinylRecord> = {}): VinylRecord => ({
  ...emptyRecord(), id: title.toLowerCase(), title, artist: 'Someone', ...change,
});

const COVER = 'data:image/jpeg;base64,AAAA';

/** Waits until the repository reports a list that satisfies the test. */
const when = (repo: Repository, ready: (records: VinylRecord[]) => boolean) =>
  new Promise<VinylRecord[]>((resolve) => {
    const stop = repo.subscribeRecords(
      (records) => {
        if (!ready(records)) return;
        queueMicrotask(() => stop());
        resolve(records);
      },
      (e) => {
        throw e;
      },
    );
  });

describe('sync codes', () => {
  it('are long, readable and different every time', () => {
    const codes = Array.from({ length: 50 }, generateCode);
    expect(new Set(codes).size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{25}$/);
  });

  it('can be typed loosely', () => {
    const code = generateCode();
    expect(normalizeCode(` ${formatCode(code).toLowerCase()} `)).toBe(code);
    expect(normalizeCode('oOiIl-0000000000-0000000000')).toBe(`0011100000000000000000000`);
    expect(normalizeCode('too short')).toBeNull();
    expect(normalizeCode('U'.repeat(25))).toBeNull();
  });
});

describe('encryption', () => {
  it('gives the same key and id for a code, and different ones otherwise', async () => {
    const [a, again, b] = await Promise.all([deriveVault('A'.repeat(25)), deriveVault('A'.repeat(25)), deriveVault('B'.repeat(25))]);
    expect(a.id).toMatch(/^[0-9a-f]{64}$/);
    expect(again.id).toBe(a.id);
    expect(b.id).not.toBe(a.id);
    expect(await unseal(again.key, 'x', await seal(a.key, 'x', { price: 5 }))).toEqual({ price: 5 });
  });

  it('refuses the wrong code, a moved item or altered bytes', async () => {
    const a = await deriveVault('A'.repeat(25));
    const b = await deriveVault('B'.repeat(25));
    const sealed = await seal(a.key, 'records/one', 'secret');
    await expect(unseal(b.key, 'records/one', sealed)).rejects.toThrow();
    await expect(unseal(a.key, 'records/two', sealed)).rejects.toThrow();
    sealed.data[0] ^= 1;
    await expect(unseal(a.key, 'records/one', sealed)).rejects.toThrow();
  });
});

describe('synced collection', () => {
  it('shares records between two devices without the database seeing them', async () => {
    const { backend, state } = fakeBackend();
    const vault = await deriveVault(generateCode());
    const phone = createSyncRepo(backend, vault);
    const laptop = createSyncRepo(backend, vault);

    await phone.saveRecord(record('Secret Album', { purchase: { price: 42, currency: 'SGD', date: '', store: 'Hidden Shop' } }), COVER);
    const [seen] = await when(laptop, (r) => r.length === 1);
    expect(seen).toMatchObject({ title: 'Secret Album', purchase: { price: 42, store: 'Hidden Shop' } });
    expect(await laptop.getCover(seen.id, seen.coverVersion)).toBe(COVER);

    const stored = [...state.items.values()].map((s) => new TextDecoder().decode(s.data)).join('') + [...state.items.keys()].join('');
    expect(stored).not.toMatch(/Secret Album|Hidden Shop|data:image/);

    await laptop.deleteRecord(seen.id);
    await when(phone, (r) => r.length === 0);
    expect(state.items.size).toBe(0);
  });

  it('keeps saves in order', async () => {
    const { backend } = fakeBackend();
    const repo = createSyncRepo(backend, await deriveVault(generateCode()));
    await Promise.all(['first', 'second', 'third'].map((notes) => repo.saveRecord(record('A', { notes }), undefined)));
    const [last] = await when(repo, (r) => r.length === 1);
    expect(last.notes).toBe('third');
  });
});

describe('moving records', () => {
  const setUp = async () => {
    const fake = fakeBackend();
    const vault = await deriveVault(generateCode());
    return { ...fake, vault, local: memoryRepo(), synced: createSyncRepo(fake.backend, vault) };
  };

  it('moves device records with their covers and leaves samples behind', async () => {
    const { backend, vault, local, synced } = await setUp();
    await local.putRecord(record('Mine', { coverVersion: 7, updatedAt: 100 }), COVER);
    await local.putRecord(sampleRecords('USD')[0], null);

    expect(await moveToSynced(local, synced, backend, vault)).toBe(1);

    const [moved] = await when(synced, (r) => r.length === 1);
    expect(moved).toMatchObject({ title: 'Mine', updatedAt: 100, coverVersion: 7 });
    expect(await synced.getCover('mine', 7)).toBe(COVER);
    expect((await listRecords(local)).map((r) => r.id)).toEqual(['sample-night-tides']);
  });

  it('does not overwrite a newer synced copy', async () => {
    const { backend, vault, local, synced } = await setUp();
    await synced.putRecord(record('Album', { notes: 'newer', updatedAt: 200 }), null);
    await local.putRecord(record('Album', { notes: 'older', updatedAt: 100 }), null);
    expect(await moveToSynced(local, synced, backend, vault)).toBe(0);
    const [kept] = await when(synced, (r) => r.length === 1);
    expect(kept.notes).toBe('newer');
    expect(await listRecords(local)).toHaveLength(0);
  });

  it('keeps a record on the device when the server does not accept it', async () => {
    const { backend, state, vault, local, synced } = await setUp();
    await local.putRecord(record('Mine'), null);
    state.failWrites = true;
    await expect(moveToSynced(local, synced, backend, vault)).rejects.toThrow('Could not reach');
    expect(await listRecords(local)).toHaveLength(1);
  });

  it('copies the collection back when syncing stops', async () => {
    const { local, synced } = await setUp();
    await synced.putRecord(record('One', { coverVersion: 3, updatedAt: 5 }), COVER);
    await synced.putRecord(record('Two', { coverVersion: 9 }), null);
    const missing = await copyToDevice(await when(synced, (r) => r.length === 2), synced, local);
    expect(missing).toBe(1);
    const copied = await listRecords(local);
    expect(copied.find((r) => r.id === 'one')).toMatchObject({ coverVersion: 3, updatedAt: 5 });
    expect(copied.find((r) => r.id === 'two')?.coverVersion).toBe(0);
    expect(await local.getCover('one', 3)).toBe(COVER);
  });
});
