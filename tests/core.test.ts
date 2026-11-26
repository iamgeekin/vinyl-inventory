import { describe, expect, it } from 'vitest';
import { discColor, readableOn } from '../src/components/colors';
import { packShelves } from '../src/components/shelf/SpineShelf';
import { buildBackup, csvCell, parseBackup, toCsv } from '../src/data/backup';
import { stamp } from '../src/data/repository';
import { sampleRecords } from '../src/data/sample';
import { filterRecords, sortRecords } from '../src/data/sort';
import { spendByCurrency, UNDATED } from '../src/data/stats';
import { formatTracks, groupBySide, parseTracks } from '../src/data/trackText';
import { emptyRecord, guessCurrency, normalizeRecord, type VinylRecord } from '../src/data/types';

const record = (change: Partial<VinylRecord>): VinylRecord => ({ ...emptyRecord(), ...change });
const priced = (price: number | null, date = '', currency = 'USD') =>
  record({ purchase: { price, currency, date, store: '' } });

describe('spend totals', () => {
  it('keeps currencies apart and avoids rounding drift', () => {
    const totals = spendByCurrency([
      priced(0.1, '2025-01-01'), priced(0.2, '2025-02-01'), priced(30, '2026-01-01'), priced(null), priced(50, '', 'SGD'),
    ]);
    expect(totals.map((t) => t.currency)).toEqual(['USD', 'SGD']);
    expect(totals[0]).toMatchObject({ total: 30.3, count: 3, average: 10.1 });
    expect(totals[0].byYear).toEqual([
      { year: '2025', total: 0.3, count: 2 },
      { year: '2026', total: 30, count: 1 },
    ]);
    expect(totals[1].byYear[0].year).toBe(UNDATED);
  });
});

describe('sorting and filtering', () => {
  const records = sampleRecords('USD');

  it('ignores a leading article when sorting by artist', () => {
    const artists = sortRecords(records, 'artist').map((r) => r.artist);
    expect(artists.indexOf('The Quiet Harbour')).toBeGreaterThan(artists.indexOf('Odile Park'));
    expect(artists.indexOf('The Quiet Harbour')).toBeLessThan(artists.indexOf('Sunday Static'));
  });

  it('sorts by purchase date and price, highest first', () => {
    expect(sortRecords(records, 'purchased')[0].title).toBe('Monsoon Radio');
    expect(sortRecords(records, 'price')[0].title).toBe('Glass Orchard');
  });

  it('filters by genre and special edition together', () => {
    const found = filterRecords(records, { genre: 'Electronic', specialOnly: true });
    expect(found.map((r) => r.title)).toEqual(['Night Tides']);
  });
});

describe('tracklist text', () => {
  it('round-trips', () => {
    const tracks = [
      { position: 'A1', title: 'One', duration: '3:00', artist: '' },
      { position: 'A2', title: 'Two', duration: '', artist: 'Guest' },
      { position: '', title: 'Three', duration: '', artist: '' },
    ];
    expect(parseTracks(formatTracks(tracks))).toEqual(tracks);
  });

  it('groups by side letter', () => {
    const tracks = parseTracks('A1 | a\nA2 | b\nB1 | c\n1 | d');
    expect(groupBySide(tracks).map((g) => [g.side, g.tracks.length])).toEqual([['Side A', 2], ['Side B', 1], ['Tracks', 1]]);
  });
});

describe('backup', () => {
  it('survives export and import', () => {
    const records = sampleRecords('SGD');
    const covers = { [records[0].id]: 'data:image/jpeg;base64,AA==' };
    const parsed = parseBackup(JSON.stringify(buildBackup(records, covers)));
    expect(parsed.records).toEqual(records);
    expect(parsed.covers).toEqual(covers);
  });

  it('rejects other files and drops non-image covers', () => {
    expect(() => parseBackup('nope')).toThrow('not valid JSON');
    expect(() => parseBackup('{"records":[]}')).toThrow('not a Vinyl Inventory backup');
    const parsed = parseBackup(JSON.stringify({ app: 'vinyl-inventory', version: 1, records: [], covers: { a: 'javascript:alert(1)' } }));
    expect(parsed.covers).toEqual({});
  });

  it('repairs damaged records', () => {
    const fixed = normalizeRecord({ id: 'x', title: 'T', purchase: { price: 'free', currency: 'dollars' }, rating: 99, tracklist: 'no' });
    expect(fixed.purchase.price).toBeNull();
    expect(fixed.purchase.currency).toBe('USD');
    expect(fixed.rating).toBe(5);
    expect(fixed.tracklist).toEqual([]);
  });

  it('stops spreadsheet formulas and quotes separators', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell(-3)).toBe('-3');
    expect(toCsv(sampleRecords('USD')).split('\r\n')).toHaveLength(9);
  });
});

describe('cover versions', () => {
  it('follows the cover change', () => {
    const base = record({ coverVersion: 5 });
    expect(stamp(base, undefined, 100).coverVersion).toBe(5);
    expect(stamp(base, null, 100).coverVersion).toBe(0);
    expect(stamp(base, 'data:image/jpeg;base64,AA==', 100).coverVersion).toBe(100);
  });
});

describe('small helpers', () => {
  it('packs spines into shelves without overflowing', () => {
    expect(packShelves([30, 30, 30, 30], (w) => w, 66, 3)).toEqual([[30, 30], [30, 30]]);
    expect(packShelves([100], (w) => w, 50)).toEqual([[100]]);
  });

  it('picks readable text and disc colours', () => {
    expect(readableOn('#dfe8e4')).toBe('#0c0c0f');
    expect(readableOn('#0f2d4a')).toBe('#ffffff');
    expect(discColor('Blue translucent')).toBe('#2f86a6');
    expect(discColor('')).toBe('#202026');
  });

  it('guesses a currency from the locale', () => {
    expect(guessCurrency('en-SG')).toBe('SGD');
    expect(guessCurrency('zh-Hant-TW')).toBe('TWD');
    expect(guessCurrency('en')).toBe('USD');
  });
});
