import type { Sealed } from './crypto';

export type Kind = 'records' | 'covers';

export interface StoredItem {
  id: string;
  sealed: Sealed;
}

export interface Write {
  kind: Kind;
  id: string;
  /** null deletes the item. */
  sealed: Sealed | null;
}

/** What syncing needs from a database. Firestore provides it; tests use a stand-in. */
export interface SyncBackend {
  /** Fails with `bad-invite` when the phrase is wrong. */
  createVault(vault: string, invite: string): Promise<void>;
  /** Asks the server, so it fails with `offline` when there is no connection. */
  vaultExists(vault: string): Promise<boolean>;
  watch(vault: string, kind: Kind, onItems: (items: StoredItem[]) => void, onError: (e: Error) => void): () => void;
  /** The current items, from the server. */
  list(vault: string, kind: Kind): Promise<StoredItem[]>;
  read(vault: string, kind: Kind, id: string, from: 'cache' | 'server'): Promise<Sealed | null>;
  /** Applied on this device at once; the promise settles when the server has accepted it. */
  write(vault: string, writes: Write[]): Promise<void>;
}

export type SyncProblem = 'bad-invite' | 'not-found' | 'offline' | 'bad-code' | 'failed';

const MESSAGES: Record<SyncProblem, string> = {
  'bad-invite': 'That invite phrase was not accepted. Check it with the person who set up syncing.',
  'not-found': 'No collection has that sync code. Check it and try again.',
  offline: 'Could not reach the sync service. Check your connection and try again.',
  'bad-code': 'That is not a sync code. It has 25 letters and numbers.',
  failed: 'Syncing did not work. Try again.',
};

export class SyncError extends Error {
  readonly problem: SyncProblem;
  constructor(problem: SyncProblem, detail = '') {
    super(detail ? `${MESSAGES[problem]} (${detail})` : MESSAGES[problem]);
    this.name = 'SyncError';
    this.problem = problem;
  }
}

/** Rejects as offline if the server has not answered in time. */
export function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SyncError('offline')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
