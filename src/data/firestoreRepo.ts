import {
  collection, deleteDoc, doc, getDoc, getDocFromCache, onSnapshot, setDoc, writeBatch, type Firestore,
} from 'firebase/firestore';
import { stamp, type Repository } from './repository';
import { normalizeRecord, type Settings } from './types';

interface CoverDoc {
  dataUrl: string;
  version: number;
}

/**
 * Everything lives under users/{uid}. Writes are applied to the offline cache at
 * once and sent when there is a connection, so they are deliberately not awaited:
 * their promises only settle after the server answers.
 */
export function createFirestoreRepo(db: Firestore, uid: string): Repository {
  const recordsRef = collection(db, 'users', uid, 'records');
  const settingsRef = doc(db, 'users', uid, 'settings', 'app');
  const coverRef = (id: string) => doc(db, 'users', uid, 'covers', id);
  const errorListeners = new Set<(e: Error) => void>();

  const track = (write: Promise<unknown>) => {
    write.catch((e: Error) => errorListeners.forEach((report) => report(new Error(`Not saved to the cloud: ${e.message}`))));
  };

  return {
    kind: 'cloud',
    subscribeRecords(onChange, onError) {
      errorListeners.add(onError);
      const stop = onSnapshot(
        recordsRef,
        (snapshot) => onChange(snapshot.docs.map((d) => normalizeRecord({ ...d.data(), id: d.id }))),
        onError,
      );
      return () => {
        errorListeners.delete(onError);
        stop();
      };
    },
    subscribeSettings(onChange, onError) {
      return onSnapshot(settingsRef, (snapshot) => onChange((snapshot.data() ?? {}) as Partial<Settings>), onError);
    },
    async saveRecord(record, cover) {
      const saved = stamp(record, cover);
      const batch = writeBatch(db);
      batch.set(doc(recordsRef, saved.id), saved);
      if (cover === null) batch.delete(coverRef(saved.id));
      else if (cover !== undefined) batch.set(coverRef(saved.id), { dataUrl: cover, version: saved.coverVersion } satisfies CoverDoc);
      track(batch.commit());
    },
    async deleteRecord(id) {
      track(deleteDoc(doc(recordsRef, id)));
      track(deleteDoc(coverRef(id)));
    },
    async getCover(id, version) {
      try {
        const cached = (await getDocFromCache(coverRef(id))).data() as CoverDoc | undefined;
        if (cached?.version === version) return cached.dataUrl;
      } catch {
        // Not cached yet.
      }
      return ((await getDoc(coverRef(id))).data() as CoverDoc | undefined)?.dataUrl ?? null;
    },
    async saveSettings(patch) {
      track(setDoc(settingsRef, patch, { merge: true }));
    },
  };
}
