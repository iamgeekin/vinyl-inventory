/**
 * 30-second previews from Apple's public search service. No key or sign-in is
 * needed. The clips are streamed from Apple and never saved.
 */
import type { VinylRecord } from '../data/types';
import { itunesRequest } from '../lookup/itunes';
import type { ItunesItem } from '../lookup/mapRelease';
import { normalizeText, sameAlbum } from '../lookup/text';
import { matchTracks, type Song, type Wanted } from './match';

export interface AlbumPreviews {
  /** One entry per track of the record, in order. */
  songs: (Song | null)[];
  /** The album on Apple Music, or '' when it was not found. */
  albumLink: string;
}

/** The store of the phone's region first, then the US store, which lists the most. */
export function storefronts(locale: string | undefined): string[] {
  const region = locale?.split('-').find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part));
  return [...new Set([region ?? 'US', 'US'])];
}

const toSong = (item: ItunesItem): Song => ({
  title: item.trackName ?? '',
  artist: item.artistName ?? '',
  album: item.collectionName ?? '',
  previewUrl: item.previewUrl ?? '',
  link: item.trackViewUrl ?? '',
});

/** Albums that look like this one, the closest title first. Live albums only if the record is one. */
export function rankAlbums(items: ItunesItem[], record: { artist: string; title: string }): ItunesItem[] {
  const title = normalizeText(record.title);
  const live = /\blive\b/;
  return items
    .filter((i) => sameAlbum({ artist: i.artistName ?? '', title: i.collectionName ?? '' }, record))
    .filter((i) => live.test(title) || !live.test(normalizeText(i.collectionName ?? '')))
    .sort((a, b) => {
      const [x, y] = [normalizeText(a.collectionName ?? ''), normalizeText(b.collectionName ?? '')];
      return Number(y === title) - Number(x === title) || x.length - y.length;
    });
}

const wantedTracks = (record: VinylRecord): Wanted[] =>
  record.tracklist.map((t) => ({ title: t.title, artist: t.artist || record.artist }));

async function search(record: VinylRecord): Promise<AlbumPreviews> {
  const wanted = wantedTracks(record);
  for (const country of storefronts(navigator.language)) {
    const found = await itunesRequest('search', {
      term: `${record.artist} ${record.title}`, entity: 'album', limit: '15', country,
    });
    const albums = rankAlbums(found, record).slice(0, 2);
    let songs: (Song | null)[] = wanted.map(() => null);
    // A second edition, such as a deluxe one, can fill tracks the first lacks.
    for (const album of albums) {
      const items = await itunesRequest('lookup', {
        id: String(album.collectionId), entity: 'song', limit: '200', country,
      });
      const matched = matchTracks(wanted, items.filter((i) => i.wrapperType === 'track').map(toSong));
      songs = songs.map((song, i) => song ?? matched[i]);
      if (songs.every(Boolean)) break;
    }
    if (songs.some(Boolean)) return { songs, albumLink: albums[0].collectionViewUrl ?? '' };
  }
  return { songs: wanted.map(() => null), albumLink: '' };
}

const cache = new Map<string, Promise<AlbumPreviews>>();

/** Remembered until the app is closed. A failed search is tried again next time. */
export function albumPreviews(record: VinylRecord): Promise<AlbumPreviews> {
  const key = JSON.stringify([record.artist, record.title, wantedTracks(record)]);
  let request = cache.get(key);
  if (!request) {
    request = search(record);
    cache.set(key, request);
    request.catch(() => cache.delete(key));
  }
  return request;
}

/** Looks for a single track that was not on the matched album. */
export async function trackPreview(track: Wanted): Promise<Song | null> {
  for (const country of storefronts(navigator.language)) {
    const items = await itunesRequest('search', {
      term: `${track.artist} ${track.title}`, entity: 'song', limit: '25', country,
    });
    const [match] = matchTracks([track], items.map(toSong));
    if (match) return match;
  }
  return null;
}
