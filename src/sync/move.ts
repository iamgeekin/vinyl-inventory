import type { Repository } from '../data/repository';
import type { VinylRecord } from '../data/types';
import { withTimeout, type SyncBackend } from './backend';
import type { Vault } from './crypto';
import { decodeRecord } from './syncRepo';

export const isSample = (record: VinylRecord) => record.id.startsWith('sample-');

const coverOf = async (from: Repository, record: VinylRecord) =>
  record.coverVersion ? await from.getCover(record.id, record.coverVersion) : null;

/** Everything stored on this device, once. */
export function listRecords(repo: Repository): Promise<VinylRecord[]> {
  return new Promise((resolve, reject) => {
    let stop: (() => void) | undefined;
    let done = false;
    const finish = (run: () => void) => {
      done = true;
      stop?.();
      run();
    };
    stop = repo.subscribeRecords(
      (records) => !done && finish(() => resolve(records)),
      (error) => !done && finish(() => reject(error)),
    );
    if (done) stop();
  });
}

/**
 * Moves this device's records into a synced collection and returns how many were
 * sent. A copy is removed from the device only once the server has it. Sample
 * records stay behind, and a newer synced version of a record is not overwritten.
 */
export async function moveToSynced(
  local: Repository,
  synced: Repository,
  backend: SyncBackend,
  vault: Vault,
  onProgress: (done: number, total: number) => void = () => {},
): Promise<number> {
  const mine = (await listRecords(local)).filter((r) => !isSample(r));
  if (!mine.length) return 0;
  const there = new Map<string, number>();
  for (const item of await withTimeout(backend.list(vault.id, 'records'))) {
    try {
      there.set(item.id, (await decodeRecord(vault, item)).updatedAt);
    } catch {
      // An unreadable item is replaced by this device's copy.
    }
  }
  let done = 0;
  let sent = 0;
  for (const record of mine) {
    if ((there.get(record.id) ?? -1) < record.updatedAt) {
      const cover = await coverOf(local, record);
      await withTimeout(synced.putRecord(cover ? record : { ...record, coverVersion: 0 }, cover));
      sent += 1;
    }
    await local.deleteRecord(record.id);
    onProgress(++done, mine.length);
  }
  return sent;
}

/** Copies the synced records back onto the device. Returns how many lost their saved cover. */
export async function copyToDevice(records: VinylRecord[], synced: Repository, local: Repository): Promise<number> {
  let missing = 0;
  for (const record of records) {
    const cover = await coverOf(synced, record).catch(() => null);
    if (record.coverVersion && !cover) missing += 1;
    await local.putRecord(cover ? record : { ...record, coverVersion: 0 }, cover);
  }
  return missing;
}
