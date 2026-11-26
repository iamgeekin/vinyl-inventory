import { itunesByText } from '../lookup/itunes';
import { itunesArtwork } from '../lookup/mapRelease';
import { sameAlbum } from '../lookup/text';
import { fetchImage, makeThumbnail, type Thumbnail } from './thumbnail';

/**
 * Finds a cover that may be saved with the record. Discogs images cannot be read
 * by the browser, so this tries Cover Art Archive and then iTunes.
 */
export async function findArtwork(
  release: { artist: string; title: string; mbid?: string; coverUrl?: string },
  signal?: AbortSignal,
): Promise<Thumbnail | null> {
  const direct = release.coverUrl ?? '';
  const urls: (() => Promise<string>)[] = [];
  if (/^https:\/\/([\w-]+\.mzstatic\.com|coverartarchive\.org)\//.test(direct)) urls.push(async () => direct);
  if (release.mbid) urls.push(async () => `https://coverartarchive.org/release/${release.mbid}/front-500`);
  urls.push(async () => {
    const results = await itunesByText(`${release.artist} ${release.title}`, signal);
    const match = results.find((c) => sameAlbum(c, release));
    return match ? itunesArtwork(match.thumbUrl, 600) : '';
  });

  for (const next of urls) {
    try {
      const url = await next();
      if (url) return await makeThumbnail(await fetchImage(url, signal));
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  return null;
}
