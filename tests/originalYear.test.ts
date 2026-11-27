import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyRecord, normalizeRecord, type VinylRecord } from '../src/data/types';
import { yearFromGroups, type MbReleaseGroup } from '../src/lookup/musicbrainz';
import { findOriginalYear } from '../src/lookup/originalYear';

const record = (links: Partial<VinylRecord['links']> = {}): VinylRecord => ({
  ...emptyRecord(),
  artist: 'The Band',
  title: 'First Light (Deluxe Edition)',
  year: 2020,
  links: { discogsId: null, mbid: '', coverUrl: '', ...links },
});

const group = (date: string, type = 'Album', secondary: string[] = [], title = 'First Light'): MbReleaseGroup => ({
  title,
  'primary-type': type,
  'secondary-types': secondary,
  'first-release-date': date,
  'artist-credit': [{ name: 'Band' }],
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Answers each address with the first reply whose key it contains. */
const serve = (replies: Record<string, () => Response>) => {
  const fetch = vi.fn(async (url: string) => {
    const key = Object.keys(replies).find((k) => url.includes(k));
    if (!key) throw new Error(`Unexpected request: ${url}`);
    return replies[key]();
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

afterEach(() => vi.unstubAllGlobals());

describe('choosing from search results', () => {
  it('prefers the studio album over a single or live album of the same name', () => {
    const groups = [group('1971', 'Single'), group('1998-05-01', 'Album', ['Live']), group('1972-03-02')];
    expect(yearFromGroups(groups, record())).toBe(1972);
  });

  it('gives no answer for same-named albums from different years', () => {
    expect(yearFromGroups([group('1994'), group('2001')], record())).toBeNull();
  });

  it('ignores other titles and undated entries', () => {
    expect(yearFromGroups([group('1960', 'Album', [], 'First Light Outtakes'), group('')], record())).toBeNull();
  });
});

describe('finding the original year', () => {
  it('takes it from the Discogs master', async () => {
    const fetch = serve({
      '/releases/7': () => json({ year: 2020, master_id: 3 }),
      '/masters/3': () => json({ year: 1972 }),
    });
    expect(await findOriginalYear(record({ discogsId: 7 }), '')).toEqual({ year: 1972, settled: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('searches MusicBrainz by name for a record without links', async () => {
    const fetch = serve({ '/release-group?': () => json({ 'release-groups': [group('1972')] }) });
    expect(await findOriginalYear(record(), '')).toEqual({ year: 1972, settled: true });
    const query = new URL(fetch.mock.calls[0][0]).searchParams.get('query');
    expect(query).toBe('releasegroup:"First Light" AND artist:"The Band"');
  });

  it('uses the MusicBrainz release when the record has one', async () => {
    serve({ '/release/abc': () => json({ 'release-group': { 'first-release-date': '1972-01-01' } }) });
    expect((await findOriginalYear(record({ mbid: 'abc' }), '')).year).toBe(1972);
  });

  it('falls back to the year of a release without a master only if MusicBrainz has none', async () => {
    serve({ '/releases/7': () => json({ year: 2020 }), '/release-group?': () => json({ 'release-groups': [] }) });
    expect((await findOriginalYear(record({ discogsId: 7 }), '')).year).toBe(2020);
  });

  it('marks the answer unsettled when Discogs fails', async () => {
    serve({
      '/releases/7': () => json({}, 429),
      '/release-group?': () => json({ 'release-groups': [group('1972')] }),
    });
    expect(await findOriginalYear(record({ discogsId: 7 }), '')).toEqual({ year: 1972, settled: false });
  });

  it('keeps a typed year through storage', () => {
    expect(normalizeRecord({ originalYear: 1972 }).originalYear).toBe(1972);
    expect(normalizeRecord({}).originalYear).toBeNull();
  });
});
