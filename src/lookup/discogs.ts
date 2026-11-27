import { fetchJson } from './http';
import { candidateFromDiscogs, draftFromDiscogs, type DiscogsRelease, type DiscogsSearchResult } from './mapRelease';
import type { Candidate, ReleaseDraft } from './types';

const API = 'https://api.discogs.com';

const init = (token: string, signal?: AbortSignal): RequestInit => ({
  signal,
  headers: token ? { Authorization: `Discogs token=${token}` } : {},
});

async function search(params: Record<string, string>, token: string, signal?: AbortSignal): Promise<Candidate[]> {
  const query = new URLSearchParams({ type: 'release', per_page: '25', ...params });
  const data = await fetchJson<{ results?: DiscogsSearchResult[] }>(
    'Discogs',
    `${API}/database/search?${query}`,
    init(token, signal),
  );
  return (data.results ?? []).map(candidateFromDiscogs);
}

export const discogsByBarcode = (barcode: string, token: string, signal?: AbortSignal) =>
  search({ barcode }, token, signal);

export const discogsByText = (q: string, token: string, signal?: AbortSignal) =>
  search({ q, format: 'Vinyl' }, token, signal);

export async function discogsRelease(id: string, token: string, signal?: AbortSignal): Promise<ReleaseDraft> {
  const data = await fetchJson<DiscogsRelease>('Discogs', `${API}/releases/${encodeURIComponent(id)}`, init(token, signal));
  return draftFromDiscogs(data);
}

/**
 * The year of the album a release belongs to. Discogs groups the versions of an
 * album under a "master"; without one, only the release's own year is known.
 */
export async function discogsOriginalYear(
  releaseId: number,
  token: string,
): Promise<{ year: number | null; fromMaster: boolean }> {
  const release = await fetchJson<{ year?: number; master_id?: number }>(
    'Discogs',
    `${API}/releases/${releaseId}`,
    init(token),
  );
  if (!release.master_id) return { year: release.year || null, fromMaster: false };
  const master = await fetchJson<{ year?: number }>('Discogs', `${API}/masters/${release.master_id}`, init(token));
  return { year: master.year || null, fromMaster: Boolean(master.year) };
}
