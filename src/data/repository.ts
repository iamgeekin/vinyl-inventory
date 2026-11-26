import type { Settings, VinylRecord } from './types';

/** `undefined` keeps the stored cover, `null` removes it, a data URL replaces it. */
export type CoverChange = string | null | undefined;

export interface Repository {
  readonly kind: 'local' | 'cloud';
  subscribeRecords(onChange: (records: VinylRecord[]) => void, onError: (e: Error) => void): () => void;
  subscribeSettings(onChange: (settings: Partial<Settings>) => void, onError: (e: Error) => void): () => void;
  saveRecord(record: VinylRecord, cover: CoverChange): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  getCover(id: string, version: number): Promise<string | null>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
}

/** Stamps the record and keeps `coverVersion` in step with the cover change. */
export function stamp(record: VinylRecord, cover: CoverChange, now = Date.now()): VinylRecord {
  const coverVersion = cover === undefined ? record.coverVersion : cover === null ? 0 : now;
  return { ...record, coverVersion, updatedAt: now };
}
