import { useSyncExternalStore } from 'react';
import { quickRecord } from '../../data/quickRecord';
import { loadRelease } from '../../lookup/lookup';
import type { Candidate } from '../../lookup/types';
import { findArtwork } from '../../scan/artwork';
import { useApp } from '../../state/AppContext';
import { candidateKey } from '../add/Candidates';

interface Status {
  busy?: boolean;
  /** The new record's ID, once it is saved. */
  added?: string;
  error?: string;
}

// Held outside the screen, so an add carries on, and cannot be started twice, if you leave it.
let statuses: Record<string, Status> = {};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const update = (key: string, status: Status) => {
  statuses = { ...statuses, [key]: status };
  listeners.forEach((listener) => listener());
};

/** Saves a search result to the collection in one step, with its artwork. */
export function useQuickAdd() {
  const { records, repo, settings } = useApp();
  const all = useSyncExternalStore(subscribe, () => statuses);

  /** A record deleted since it was added can be added again. */
  const status = (key: string): Status => {
    const found = all[`${repo.key}/${key}`] ?? {};
    return found.added && !records.some((r) => r.id === found.added) ? {} : found;
  };

  const add = async (candidate: Candidate) => {
    const key = `${repo.key}/${candidateKey(candidate)}`;
    if (statuses[key]?.busy) return;
    update(key, { busy: true });
    try {
      const draft = await loadRelease(candidate, settings.discogsToken);
      const record = quickRecord(draft, candidate, settings.currency);
      // Without artwork the record is still saved, and shows the linked picture.
      const art = await findArtwork({ artist: record.artist, title: record.title, coverUrl: record.links.coverUrl }).catch(() => null);
      await repo.saveRecord(
        art ? { ...record, spineColor: art.spineColor, popColor: art.popColor } : record,
        art?.dataUrl,
      );
      update(key, { added: record.id });
    } catch (e) {
      update(key, { error: `Could not add ${candidate.title}: ${(e as Error).message}` });
    }
  };

  return { add, status };
}
