import type { VinylRecord } from './types';

/** `undefined` keeps the stored cover, `null` removes it, a data URL replaces it. */
export type CoverChange = string | null | undefined;

export interface Repository {
  readonly kind: 'local' | 'synced';
  /** Tells one collection's cached covers from another's. */
  readonly key: string;
  subscribeRecords(onChange: (records: VinylRecord[]) => void, onError: (e: Error) => void): () => void;
  saveRecord(record: VinylRecord, cover: CoverChange): Promise<void>;
  /**
   * Stores a record exactly as given, timestamps included, for moving it between
   * collections. Resolves once it is safely stored.
   */
  putRecord(record: VinylRecord, cover: string | null): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  getCover(id: string, version: number): Promise<string | null>;
}

/** Stamps the record and keeps `coverVersion` in step with the cover change. */
export function stamp(record: VinylRecord, cover: CoverChange, now = Date.now()): VinylRecord {
  const coverVersion = cover === undefined ? record.coverVersion : cover === null ? 0 : now;
  return { ...record, coverVersion, updatedAt: now };
}
