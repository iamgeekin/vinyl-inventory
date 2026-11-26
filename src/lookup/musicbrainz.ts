import { fetchJson, LookupError } from './http';
import { candidateFromMb, draftFromMb, type MbRelease } from './mapRelease';
import type { Candidate, ReleaseDraft } from './types';

const API = 'https://musicbrainz.org/ws/2';

/** MusicBrainz often answers 503 when busy, so one delayed retry is worth it. */
async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  try {
    return await fetchJson<T>('MusicBrainz', url, { signal });
  } catch (e) {
    if (!(e instanceof LookupError) || e.status !== 503) throw e;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return fetchJson<T>('MusicBrainz', url, { signal });
  }
}

export async function musicbrainzByBarcodes(barcodes: string[], signal?: AbortSignal): Promise<Candidate[]> {
  const query = barcodes.map((b) => `barcode:${b.replace(/\D/g, '')}`).join(' OR ');
  const data = await request<{ releases?: MbRelease[] }>(
    `${API}/release?${new URLSearchParams({ query, fmt: 'json', limit: '25' })}`,
    signal,
  );
  return (data.releases ?? []).map(candidateFromMb);
}

export async function musicbrainzRelease(id: string, signal?: AbortSignal): Promise<ReleaseDraft> {
  const data = await request<MbRelease>(
    `${API}/release/${encodeURIComponent(id)}?inc=recordings+artist-credits+labels&fmt=json`,
    signal,
  );
  return draftFromMb(data);
}
