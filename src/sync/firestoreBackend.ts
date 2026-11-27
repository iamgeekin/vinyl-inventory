import { initializeApp, FirebaseError } from 'firebase/app';
import {
  Bytes, collection, doc, getDocFromCache, getDocFromServer, getDocsFromServer, initializeFirestore, limit,
  onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, serverTimestamp, setDoc, writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { firebaseConfig } from '../config';
import { SyncError, withTimeout, type Kind, type SyncBackend } from './backend';
import type { Sealed } from './crypto';

const code = (error: unknown) => (error instanceof FirebaseError ? error.code : '');

const toDoc = (sealed: Sealed) => ({ v: 1, iv: Bytes.fromUint8Array(sealed.iv), data: Bytes.fromUint8Array(sealed.data) });

const fromDoc = (data: DocumentData | undefined): Sealed | null =>
  data?.iv instanceof Bytes && data.data instanceof Bytes
    ? { iv: new Uint8Array(data.iv.toUint8Array()), data: new Uint8Array(data.data.toUint8Array()) }
    : null;

/** Vault layout: vaults/{id} holds the invite check; records and covers sit beneath it. */
export function createBackend(): SyncBackend {
  const db = initializeFirestore(initializeApp(firebaseConfig), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const items = (vault: string, kind: Kind) => collection(db, 'vaults', vault, kind);
  const item = (vault: string, kind: Kind, id: string) => doc(db, 'vaults', vault, kind, id);

  return {
    async createVault(vault, invite) {
      try {
        await withTimeout(setDoc(doc(db, 'vaults', vault), { invite, createdAt: serverTimestamp() }));
      } catch (e) {
        if (code(e) === 'permission-denied') throw new SyncError('bad-invite');
        throw e instanceof SyncError ? e : new SyncError('failed', code(e));
      }
    },
    async vaultExists(vault) {
      try {
        // The rules allow reading a vault's records only if the vault exists.
        await withTimeout(getDocsFromServer(query(items(vault, 'records'), limit(1))));
        return true;
      } catch (e) {
        if (code(e) === 'permission-denied') return false;
        if (code(e) === 'unavailable') throw new SyncError('offline');
        throw e instanceof SyncError ? e : new SyncError('failed', code(e));
      }
    },
    watch(vault, kind, onItems, onError) {
      return onSnapshot(
        items(vault, kind),
        (snapshot) =>
          onItems(
            snapshot.docs.flatMap((d) => {
              const sealed = fromDoc(d.data());
              return sealed ? [{ id: d.id, sealed }] : [];
            }),
          ),
        (e) => onError(new SyncError('failed', e.code)),
      );
    },
    async list(vault, kind) {
      const snapshot = await getDocsFromServer(items(vault, kind));
      return snapshot.docs.flatMap((d) => {
        const sealed = fromDoc(d.data());
        return sealed ? [{ id: d.id, sealed }] : [];
      });
    },
    async read(vault, kind, id, from) {
      const get = from === 'cache' ? getDocFromCache : getDocFromServer;
      return fromDoc((await get(item(vault, kind, id))).data());
    },
    write(vault, writes) {
      const batch = writeBatch(db);
      for (const w of writes) {
        if (w.sealed) batch.set(item(vault, w.kind, w.id), toDoc(w.sealed));
        else batch.delete(item(vault, w.kind, w.id));
      }
      return batch.commit();
    },
  };
}
