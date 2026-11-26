import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleRecords } from '../src/data/sample';
import { barcodeVariants, hasValidCheckDigit } from '../src/lookup/barcode';
import { findOwned, lookupBarcode } from '../src/lookup/lookup';
import { candidateFromDiscogs, draftFromDiscogs, draftFromItunes, draftFromMb, pressingFromFormats } from '../src/lookup/mapRelease';
import { sameAlbum } from '../src/lookup/text';
import { signature, similarity } from '../src/scan/imageRank';
import { pickWords, queryPlan } from '../src/scan/textClean';
import { createSearch } from '../src/search';

describe('barcodes', () => {
  it('checks the check digit', () => {
    expect(hasValidCheckDigit('5012394144777')).toBe(true);
    expect(hasValidCheckDigit('602547670342')).toBe(true);
    expect(hasValidCheckDigit('5012394144778')).toBe(false);
    expect(hasValidCheckDigit('123')).toBe(false);
  });

  it('tries both UPC and EAN spellings', () => {
    expect(barcodeVariants('6 02547 67034 2')).toEqual(['602547670342', '0602547670342']);
    expect(barcodeVariants('0602547670342')).toEqual(['0602547670342', '602547670342']);
    expect(barcodeVariants('abc')).toEqual([]);
  });
});

describe('Discogs mapping', () => {
  it('reads edition, colour and speed from the format', () => {
    const { format, edition } = pressingFromFormats([
      { name: 'Vinyl', qty: '2', descriptions: ['LP', 'Album', 'Limited Edition', 'Numbered', '33 ⅓ RPM'], text: 'Red Translucent, 180 Gram, Gatefold Sleeve' },
    ]);
    expect(format).toMatchObject({ size: '12"', speed: '33', discs: 2 });
    expect(edition).toMatchObject({ isSpecial: true, name: 'Limited Edition', color: 'Red Translucent' });
  });

  it('does not call plain black vinyl special, or a coloured sleeve a coloured disc', () => {
    expect(pressingFromFormats([{ name: 'Vinyl', descriptions: ['LP'], text: 'Black' }]).edition.isSpecial).toBe(false);
    expect(pressingFromFormats([{ name: 'Vinyl', descriptions: ['LP'], text: 'Red Labels' }]).edition.color).toBe('');
  });

  it('builds a draft', () => {
    const draft = draftFromDiscogs({
      id: 7,
      title: 'Album',
      artists: [{ name: 'First (2)', join: '&' }, { name: 'Second*' }],
      labels: [{ name: 'Label (3)', catno: 'AB-1' }],
      identifiers: [{ type: 'Barcode', value: '5 012394 144777' }],
      images: [{ type: 'primary', uri: 'https://i.discogs.com/x.jpeg' }],
      tracklist: [
        { type_: 'heading', title: 'Part one' },
        { position: 'A1', title: 'Song', duration: '3:32', type_: 'track' },
        { type_: 'index', title: 'Suite', sub_tracks: [{ position: 'A2', title: 'Movement' }] },
      ],
    });
    expect(draft.artist).toBe('First & Second');
    expect(draft.label).toBe('Label');
    expect(draft.barcode).toBe('5012394144777');
    expect(draft.tracklist.map((t) => t.title)).toEqual(['Song', 'Movement']);
    expect(draft.links).toMatchObject({ discogsId: 7, coverUrl: 'https://i.discogs.com/x.jpeg' });
  });

  it('splits a search title into artist and album', () => {
    const c = candidateFromDiscogs({ id: 1, title: 'Artist (4) - Album - Deluxe', format: ['Vinyl', 'LP'] });
    expect(c).toMatchObject({ artist: 'Artist', title: 'Album - Deluxe', isVinyl: true });
  });
});

describe('other sources', () => {
  it('maps MusicBrainz tracks', () => {
    const draft = draftFromMb({
      id: 'abc',
      title: 'T',
      date: '1999-02-01',
      'artist-credit': [{ name: 'A' }],
      media: [{ format: '12" Vinyl', tracks: [{ number: 'A1', title: 'x', length: 212000 }] }],
    });
    expect(draft).toMatchObject({ artist: 'A', year: 1999 });
    expect(draft.tracklist[0]).toMatchObject({ position: 'A1', duration: '3:32' });
  });

  it('orders iTunes tracks and rewrites the artwork size', () => {
    const draft = draftFromItunes([
      { wrapperType: 'collection', collectionId: 1, artistName: 'A', collectionName: 'T', artworkUrl100: 'https://is1.mzstatic.com/a/100x100bb.jpg' },
      { wrapperType: 'track', trackName: 'two', trackNumber: 2 },
      { wrapperType: 'track', trackName: 'one', trackNumber: 1 },
    ]);
    expect(draft?.tracklist.map((t) => t.title)).toEqual(['one', 'two']);
    expect(draft?.links.coverUrl).toBe('https://is1.mzstatic.com/a/600x600bb.jpg');
  });

  it('recognises the same album with different spelling', () => {
    expect(sameAlbum({ artist: 'The Beatles', title: 'Abbey Road (Remastered)' }, { artist: 'Beatles', title: 'Abbey Road' })).toBe(true);
    expect(sameAlbum({ artist: 'Beatles', title: 'Revolver' }, { artist: 'Beatles', title: 'Help!' })).toBe(false);
    expect(sameAlbum({ artist: '', title: '' }, { artist: '', title: '' })).toBe(false);
  });

  it('finds records already owned', () => {
    const records = sampleRecords('USD');
    expect(findOwned(records, { artist: 'marina vale', title: 'night tides', barcode: '' })).toHaveLength(1);
    expect(findOwned(records, records[0])).toHaveLength(0);
  });
});

describe('barcode lookup fallback', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('moves on to MusicBrainz when Discogs fails, and reports the problem', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('discogs')
        ? new Response('{}', { status: 429 })
        : new Response(JSON.stringify({ releases: [{ id: 'm', title: 'Found', media: [{ format: 'Vinyl' }] }] })),
    ));
    const result = await lookupBarcode('5012394144777', '');
    expect(result.candidates[0]).toMatchObject({ source: 'musicbrainz', title: 'Found' });
    expect(result.problems[0]).toContain('rate limited');
  });
});

describe('collection search', () => {
  const search = createSearch(sampleRecords('USD'));

  it('finds songs and says which record they are on', () => {
    const { songs, albums } = search('lantern');
    expect(songs.map((s) => [s.track.title, s.record.title, s.track.position])).toContainEqual(['Lantern Room', 'Night Tides', 'B2']);
    expect(albums.map((a) => a.record.title)).toContain('Paper Lanterns');
  });

  it('forgives typos and partial words', () => {
    expect(search('halcion').albums[0].record.title).toBe('Halcyon Drive');
    expect(search('mari').albums[0].record.artist).toBe('Marina Vale');
  });

  it('needs every word to match, across fields', () => {
    expect(search('marina undertow').songs.map((s) => s.track.title)).toEqual(['Undertow']);
    expect(search('marina halcyon').albums).toEqual([]);
  });

  it('searches edition, catalogue number and tags', () => {
    expect(search('sea glass').albums[0].record.title).toBe('Night Tides');
    expect(search('SMP-003').albums[0].record.title).toBe('Concrete Garden');
    expect(search('').songs).toEqual([]);
  });

  it('matches single Japanese characters inside a title', () => {
    const [first] = sampleRecords('USD');
    const result = createSearch([{ ...first, title: '夜の海' }])('海');
    expect(result.albums).toHaveLength(1);
  });
});

describe('cover photo reading', () => {
  it('drops noise and keeps reading order', () => {
    const words = pickWords([
      { text: 'STEREO', confidence: 99, height: 90 },
      { text: 'NIGHT', confidence: 90, height: 80 },
      { text: 'TIDES.', confidence: 88, height: 80 },
      { text: '~|', confidence: 95, height: 100 },
      { text: 'blur', confidence: 20, height: 40 },
      { text: 'Vale', confidence: 80, height: 30 },
    ]);
    expect(words).toEqual(['NIGHT', 'TIDES', 'Vale']);
  });

  it('plans from specific to loose queries', () => {
    expect(queryPlan(['a1', 'Paper', 'Lanterns'])[0]).toBe('a1 Paper Lanterns');
    expect(queryPlan(['Paper', 'Lanterns'])).toContain('Lanterns');
    expect(queryPlan([])).toEqual([]);
  });

  it('scores the same picture above a different one', () => {
    const image = (paint: (x: number, y: number) => [number, number, number]) => {
      const data = new Uint8ClampedArray(36 * 36 * 4);
      for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) data.set([...paint(x, y), 255], (y * 36 + x) * 4);
      return signature(data, 36, 36);
    };
    const a = image((x) => [x * 7, 40, 200]);
    const same = image((x) => [x * 7, 44, 196]);
    const other = image((x, y) => [240, y < 18 ? 220 : 20, x]);
    expect(similarity(a, a)).toBeCloseTo(1);
    expect(similarity(a, same)).toBeGreaterThan(similarity(a, other));
  });
});
