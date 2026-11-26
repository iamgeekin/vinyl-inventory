import MiniSearch from 'minisearch';
import type { Track, VinylRecord } from '../data/types';
import { normalizeText } from '../lookup/text';

const FIELDS = ['artist', 'title', 'tracks', 'trackArtists', 'label', 'edition', 'codes', 'extra'] as const;
type Field = (typeof FIELDS)[number];

const CJK = /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu;

/** Words, with each Chinese, Japanese or Korean character searchable on its own. */
export function tokenize(text: string): string[] {
  return normalizeText(text).replace(CJK, ' $1 ').split(' ').filter(Boolean);
}

function fieldText(r: VinylRecord, field: Field): string {
  switch (field) {
    case 'artist': return r.artist;
    case 'title': return r.title;
    case 'tracks': return r.tracklist.map((t) => t.title).join(' ');
    case 'trackArtists': return r.tracklist.map((t) => t.artist).join(' ');
    case 'label': return r.label;
    case 'edition': return [r.edition.name, r.edition.color, r.edition.numbering, r.edition.notes, r.format.text].join(' ');
    case 'codes': return [r.catalogNumber, r.catalogNumber.replace(/[\s-]/g, ''), r.barcode].join(' ');
    case 'extra': return [...r.tags, ...r.genres, ...r.styles, r.notes, r.purchase.store, r.year ?? ''].join(' ');
  }
}

export interface SongHit {
  record: VinylRecord;
  track: Track;
  /** Terms that matched, for highlighting. */
  terms: string[];
}

export interface AlbumHit {
  record: VinylRecord;
  terms: string[];
}

export interface SearchResults {
  songs: SongHit[];
  albums: AlbumHit[];
}

export function createSearch(records: VinylRecord[]): (query: string) => SearchResults {
  const byId = new Map(records.map((r) => [r.id, r]));
  const index = new MiniSearch<VinylRecord>({
    fields: [...FIELDS],
    extractField: (record, field) => (field === 'id' ? record.id : fieldText(record, field as Field)),
    tokenize,
    processTerm: (term) => term,
    searchOptions: {
      boost: { artist: 3, title: 3, tracks: 2 },
      prefix: true,
      // Short words are too easy to confuse with other words, so only longer ones tolerate typos.
      fuzzy: (term) => (term.length > 4 && !/^\d+$/.test(term) ? 0.2 : false),
      weights: { fuzzy: 0.2, prefix: 0.6 },
      combineWith: 'AND',
    },
  });
  index.addAll(records);

  return (query) => {
    const songs: SongHit[] = [];
    const albums: AlbumHit[] = [];
    if (!tokenize(query).length) return { songs, albums };
    for (const result of index.search(query)) {
      const record = byId.get(result.id as string);
      if (!record) continue;
      const entries = Object.entries(result.match);
      const trackTerms = entries.filter(([, fields]) => fields.includes('tracks')).map(([term]) => term);
      if (entries.some(([, fields]) => fields.some((f) => f !== 'tracks'))) {
        albums.push({ record, terms: result.terms });
      }
      if (trackTerms.length) {
        const scored = record.tracklist
          .map((track) => {
            const words = new Set(tokenize(track.title));
            return { track, score: trackTerms.filter((t) => words.has(t)).length };
          })
          .filter((s) => s.score > 0);
        const best = Math.max(0, ...scored.map((s) => s.score));
        for (const s of scored.filter((s) => s.score === best)) {
          songs.push({ record, track: s.track, terms: trackTerms });
        }
      }
    }
    // Results holding the words together, as typed, come before scattered matches.
    const phrase = ` ${tokenize(query).join(' ')}`;
    const together = (text: string) => Number(` ${tokenize(text).join(' ')}`.includes(phrase));
    const albumScore = (hit: AlbumHit) =>
      Math.max(...FIELDS.filter((f) => f !== 'tracks').map((f) => together(fieldText(hit.record, f))));
    albums.sort((a, b) => albumScore(b) - albumScore(a));
    songs.sort((a, b) => together(b.track.title) - together(a.track.title));
    return { songs, albums };
  };
}
