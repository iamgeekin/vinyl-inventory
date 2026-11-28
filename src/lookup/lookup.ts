import type { VinylRecord } from '../data/types';
import { barcodeVariants, cleanBarcode } from './barcode';
import { discogsByBarcode, discogsByText, discogsRelease } from './discogs';
import { itunesByText, itunesByUpc, itunesRelease } from './itunes';
import { musicbrainzByBarcodes, musicbrainzRelease } from './musicbrainz';
import { sameAlbum } from './text';
import type { Candidate, ReleaseDraft } from './types';

export interface LookupResult {
  candidates: Candidate[];
  /** Problems met along the way, to show when results are missing or partial. */
  problems: string[];
}

const vinylFirst = (list: Candidate[]) => [...list].sort((a, b) => Number(b.isVinyl) - Number(a.isVinyl));

/** Runs each search in turn and returns the first one that finds something. */
async function firstWithResults(
  searches: (() => Promise<Candidate[]>)[],
  signal?: AbortSignal,
): Promise<LookupResult> {
  const problems: string[] = [];
  for (const search of searches) {
    try {
      const candidates = await search();
      if (candidates.length) return { candidates: vinylFirst(candidates), problems };
    } catch (e) {
      if (signal?.aborted) throw e;
      problems.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { candidates: [], problems };
}

export function lookupBarcode(input: string, token: string, signal?: AbortSignal): Promise<LookupResult> {
  const variants = barcodeVariants(input);
  if (!variants.length) return Promise.resolve({ candidates: [], problems: [] });
  return firstWithResults(
    [
      ...variants.map((code) => async () => {
        const found = await discogsByBarcode(code, token, signal);
        return found.map((c) => ({ ...c, barcode: cleanBarcode(input) }));
      }),
      () => musicbrainzByBarcodes(variants, signal),
      ...variants.map((code) => () => itunesByUpc(code, signal)),
    ],
    signal,
  );
}

export function searchReleases(query: string, token: string, signal?: AbortSignal): Promise<LookupResult> {
  return firstWithResults(
    [() => discogsByText(query, token, signal), () => itunesByText(query, signal)],
    signal,
  );
}

/** Searches Discogs alone, by barcode first when that is what was typed. */
export function searchDiscogs(query: string, token: string, signal?: AbortSignal): Promise<LookupResult> {
  const isBarcode = /^[\d\s-]+$/.test(query) && [8, 12, 13, 14].includes(cleanBarcode(query).length);
  return firstWithResults(
    [
      ...(isBarcode ? barcodeVariants(query).map((code) => () => discogsByBarcode(code, token, signal)) : []),
      () => discogsByText(query, token, signal),
    ],
    signal,
  );
}

/** Discogs releases that may be the pressing of a record already in the collection. */
export function discogsMatches(
  record: { artist: string; title: string; barcode: string },
  token: string,
  signal?: AbortSignal,
): Promise<LookupResult> {
  return firstWithResults(
    [
      ...barcodeVariants(record.barcode).map((code) => () => discogsByBarcode(code, token, signal)),
      () => discogsByText(`${record.artist} ${record.title}`.trim(), token, signal),
    ],
    signal,
  );
}

export function loadRelease(candidate: Candidate, token: string, signal?: AbortSignal): Promise<ReleaseDraft> {
  if (candidate.source === 'discogs') return discogsRelease(candidate.id, token, signal);
  if (candidate.source === 'musicbrainz') return musicbrainzRelease(candidate.id, signal);
  return itunesRelease(candidate.id, signal);
}

/** Records already in the collection that look like the one being added. */
export function findOwned(
  records: VinylRecord[],
  release: { id?: string; artist: string; title: string; barcode: string; links?: { discogsId: number | null } },
): VinylRecord[] {
  const code = cleanBarcode(release.barcode);
  const codes = new Set(barcodeVariants(code));
  return records.filter(
    (r) =>
      r.id !== release.id &&
      ((release.links?.discogsId && r.links.discogsId === release.links.discogsId) ||
        (code && codes.has(cleanBarcode(r.barcode))) ||
        sameAlbum(r, release)),
  );
}
