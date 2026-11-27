/**
 * The year an album first came out, which for a reissue is earlier than the year
 * of the pressing. Discogs is asked first, because it knows which album a
 * release belongs to, then MusicBrainz.
 */
import { createStore, get, set } from 'idb-keyval';
import type { VinylRecord } from '../data/types';
import { discogsOriginalYear } from './discogs';
import { musicbrainzFirstYear, musicbrainzYearByName } from './musicbrainz';

export interface Found {
  year: number | null;
  /** False when a service failed, so the answer is worth asking for again. */
  settled: boolean;
}

export async function findOriginalYear(
  record: Pick<VinylRecord, 'artist' | 'title' | 'links'>,
  token: string,
): Promise<Found> {
  const { discogsId, mbid } = record.links;
  let settled = true;
  const attempt = async <T>(task: () => Promise<T>): Promise<T | null> => {
    try {
      return await task();
    } catch {
      settled = false;
      return null;
    }
  };

  const discogs = discogsId ? await attempt(() => discogsOriginalYear(discogsId, token)) : null;
  if (discogs?.fromMaster) return { year: discogs.year, settled };

  const musicbrainz = await attempt(async () =>
    (mbid ? await musicbrainzFirstYear(mbid) : null) ?? (await musicbrainzYearByName(record.artist, record.title)),
  );
  // A release that Discogs does not group with others is the only one it knows of.
  return { year: musicbrainz ?? discogs?.year ?? null, settled };
}

// Answers are kept on this device, so a record page needs the connection only once.
// They are not written to the record, which would change a shared collection.
let store: ReturnType<typeof createStore> | undefined;
const years = () => (store ??= createStore('vinyl-original-years', 'years'));
const requests = new Map<string, Promise<number | null>>();

const keyOf = ({ artist, title, links }: VinylRecord) =>
  JSON.stringify([links.discogsId, links.mbid, artist, title]);

export function originalYear(record: VinylRecord, token: string): Promise<number | null> {
  const key = keyOf(record);
  let request = requests.get(key);
  if (!request) {
    request = (async () => {
      const kept = await get<number>(key, years()).catch(() => undefined);
      if (kept) return kept;
      const { year, settled } = await findOriginalYear(record, token);
      if (!settled) requests.delete(key);
      else if (year) await set(key, year, years()).catch(() => {});
      return year;
    })();
    requests.set(key, request);
  }
  return request;
}
