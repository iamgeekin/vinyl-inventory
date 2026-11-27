// Loaded only when syncing is used, so the database library is not part of the first download.
import type { Repository } from '../data/repository';
import { SyncError, type SyncBackend } from './backend';
import { generateCode, normalizeCode } from './code';
import { deriveVault, type Vault } from './crypto';
import { createBackend } from './firestoreBackend';
import { moveToSynced } from './move';
import { createSyncRepo } from './syncRepo';

let shared: SyncBackend | undefined;
const backend = () => (shared ??= createBackend());

export interface Session {
  code: string;
  repo: Repository;
  /** Moves records saved only on this device into the collection. */
  moveFrom: (local: Repository, onProgress?: (done: number, total: number) => void) => Promise<number>;
}

function session(code: string, vault: Vault): Session {
  const repo = createSyncRepo(backend(), vault);
  return { code, repo, moveFrom: (local, onProgress) => moveToSynced(local, repo, backend(), vault, onProgress) };
}

/** Opens a collection already linked to this device. Works offline. */
export const openSession = async (code: string) => session(code, await deriveVault(code));

export async function createCollection(invite: string): Promise<Session> {
  if (!navigator.onLine) throw new SyncError('offline');
  const code = generateCode();
  const vault = await deriveVault(code);
  await backend().createVault(vault.id, invite.trim());
  return session(code, vault);
}

export async function joinCollection(input: string): Promise<Session> {
  const code = normalizeCode(input);
  if (!code) throw new SyncError('bad-code');
  if (!navigator.onLine) throw new SyncError('offline');
  const vault = await deriveVault(code);
  if (!(await backend().vaultExists(vault.id))) throw new SyncError('not-found');
  return session(code, vault);
}
