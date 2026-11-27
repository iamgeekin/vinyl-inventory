import { useEffect, useState } from 'react';
import type { VinylRecord } from '../data/types';
import { isSample } from '../sync/move';
import { originalYear } from './originalYear';

/** The year typed into the record, or else the one found online. Null while unknown. */
export function useOriginalYear(record: VinylRecord | undefined, token: string, ready: boolean): number | null {
  const [found, setFound] = useState<{ id: string; year: number | null }>();
  // Sample albums are invented, so there is nothing to look up.
  const wanted = ready && record && !record.originalYear && !isSample(record) ? record : null;
  const { id, artist, title } = wanted ?? {};
  const { discogsId, mbid } = wanted?.links ?? {};

  useEffect(() => {
    if (!wanted) return;
    let live = true;
    originalYear(wanted, token).then((year) => live && setFound({ id: wanted.id, year }));
    return () => {
      live = false;
    };
    // Runs again only when something that identifies the album changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, artist, title, discogsId, mbid, token]);

  if (!record) return null;
  return record.originalYear ?? (found?.id === record.id ? found.year : null);
}
