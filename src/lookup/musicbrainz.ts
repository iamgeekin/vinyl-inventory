import { fetchJson, LookupError } from './http';
import { candidateFromMb, draftFromMb, type MbRelease } from './mapRelease';
import { sameAlbum } from './text';
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

export interface MbReleaseGroup {
  title?: string;
  'primary-type'?: string | null;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  'artist-credit'?: { name: string; joinphrase?: string }[];
}

const yearOf = (date: string | undefined): number | null => Number(date?.slice(0, 4)) || null;

/** The first release year of the album a MusicBrainz release belongs to. */
export async function musicbrainzFirstYear(releaseId: string): Promise<number | null> {
  const data = await request<{ 'release-group'?: MbReleaseGroup }>(
    `${API}/release/${encodeURIComponent(releaseId)}?inc=release-groups&fmt=json`,
  );
  return yearOf(data['release-group']?.['first-release-date']);
}

/**
 * Picks the year from search results, or null when unsure. Studio albums win over
 * singles, and singles over live albums and compilations of the same name. Albums
 * sharing a name but not a year, such as several self-titled ones, give no answer.
 */
export function yearFromGroups(groups: MbReleaseGroup[], record: { artist: string; title: string }): number | null {
  const same = groups.filter((g) => {
    const artist = (g['artist-credit'] ?? []).map((a) => a.name + (a.joinphrase ?? '')).join('');
    return yearOf(g['first-release-date']) && sameAlbum({ artist, title: g.title ?? '' }, record);
  });
  const plain = same.filter((g) => !g['secondary-types']?.length);
  const albums = plain.filter((g) => g['primary-type'] === 'Album');
  const best = [albums, plain, same].find((tier) => tier.length) ?? [];
  const years = new Set(best.map((g) => yearOf(g['first-release-date'])));
  return years.size === 1 ? [...years][0] : null;
}

const phrase = (text: string) => `"${text.replace(/["\\]/g, '\\$&')}"`;

export async function musicbrainzYearByName(artist: string, title: string): Promise<number | null> {
  // Additions such as "(Deluxe Edition)" are not part of the album's name.
  const name = title.replace(/\s*[([].*?[)\]]/g, '').trim();
  if (!artist.trim() || !name) return null;
  const query = `releasegroup:${phrase(name)} AND artist:${phrase(artist.trim())}`;
  const data = await request<{ 'release-groups'?: MbReleaseGroup[] }>(
    `${API}/release-group?${new URLSearchParams({ query, fmt: 'json', limit: '100' })}`,
  );
  return yearFromGroups(data['release-groups'] ?? [], { artist, title });
}

export async function musicbrainzRelease(id: string, signal?: AbortSignal): Promise<ReleaseDraft> {
  const data = await request<MbRelease>(
    `${API}/release/${encodeURIComponent(id)}?inc=recordings+artist-credits+labels&fmt=json`,
    signal,
  );
  return draftFromMb(data);
}
