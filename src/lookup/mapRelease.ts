import type { Track } from '../data/types';
import type { Candidate, ReleaseDraft } from './types';

// ---------- Discogs ----------

export interface DiscogsFormat {
  name?: string;
  qty?: string;
  text?: string;
  descriptions?: string[];
}

export interface DiscogsSearchResult {
  id: number;
  title?: string;
  year?: string;
  country?: string;
  label?: string[];
  catno?: string;
  format?: string[];
  formats?: DiscogsFormat[];
  barcode?: string[];
  thumb?: string;
  cover_image?: string;
}

interface DiscogsArtist {
  name: string;
  anv?: string;
  join?: string;
}

interface DiscogsTrack {
  position?: string;
  title?: string;
  duration?: string;
  type_?: string;
  artists?: DiscogsArtist[];
  sub_tracks?: DiscogsTrack[];
}

export interface DiscogsRelease {
  id: number;
  title?: string;
  artists?: DiscogsArtist[];
  year?: number;
  country?: string;
  labels?: { name?: string; catno?: string }[];
  formats?: DiscogsFormat[];
  tracklist?: DiscogsTrack[];
  genres?: string[];
  styles?: string[];
  identifiers?: { type?: string; value?: string }[];
  images?: { type?: string; uri?: string; uri150?: string }[];
}

const cleanName = (name: string) => name.replace(/\s\(\d+\)$/, '').replace(/\*$/, '').trim();

export function joinArtists(artists: DiscogsArtist[] | undefined): string {
  return (artists ?? [])
    .map((a, i, all) => {
      const name = cleanName(a.anv || a.name);
      if (i === all.length - 1) return name;
      const join = a.join?.trim() || ',';
      return join === ',' ? `${name}, ` : `${name} ${join} `;
    })
    .join('');
}

const COLOUR =
  /\b(black|white|red|blue|green|yellow|orange|purple|violet|pink|clear|transparent|translucent|gold|silver|brown|gr[ae]y|teal|turquoise|cream|magenta|cyan|amber|bone|marbled?|splatter(ed)?|swirl|smoke|galaxy|coke bottle|glow in the dark|multi-?colou?r(ed)?)\b/i;
const NOT_THE_DISC = /\b(sleeve|cover|label|obi|sticker|jacket|insert|poster|booklet|print|foil|slipmat|text|logo)s?\b/i;
const SPECIAL_DESCRIPTIONS = [
  'Limited Edition', 'Special Edition', 'Deluxe Edition', 'Club Edition', 'Picture Disc', 'Test Pressing', 'Promo',
];
const EDITION_TEXT = /\b(edition|record store day|rsd|exclusive|anniversary)\b/i;

export function pressingFromFormats(formats: DiscogsFormat[] | undefined): Pick<ReleaseDraft, 'format' | 'edition'> {
  const all = formats ?? [];
  const vinyl = all.filter((f) => f.name === 'Vinyl');
  const used = vinyl.length ? vinyl : all;
  const descriptions = used.flatMap((f) => f.descriptions ?? []);
  const segments = all
    .flatMap((f) => (f.text ?? '').split(/[,;/]+(?![^()]*\))/))
    .map((s) => s.trim())
    .filter(Boolean);

  const size = descriptions.find((d) => /^(7|10|12)"$/.test(d)) ?? (descriptions.includes('LP') ? '12"' : '');
  const rpm = descriptions.map((d) => /^(33|45|78)\b.*RPM$/i.exec(d)?.[1]).find(Boolean) ?? '';
  const discs = vinyl.reduce((n, f) => n + (Number(f.qty) || 1), 0) || 1;

  const colours = [...new Set(segments.filter((s) => COLOUR.test(s) && !NOT_THE_DISC.test(s)))];
  const names = [
    ...new Set([
      ...SPECIAL_DESCRIPTIONS.filter((d) => descriptions.includes(d)),
      ...segments.filter((s) => EDITION_TEXT.test(s)),
    ]),
  ];
  const numbered = descriptions.includes('Numbered') || segments.some((s) => /\bnumbered\b/i.test(s));
  const colour = colours.join(', ');
  const colouredDisc = colour !== '' && !/^black( vinyl)?$/i.test(colour);

  return {
    format: {
      size,
      speed: rpm,
      discs,
      text: [...new Set([...descriptions, ...segments])].join(', '),
    },
    edition: {
      isSpecial: names.length > 0 || numbered || colouredDisc,
      name: names.join(', '),
      color: colour,
      numbering: '',
      notes: numbered ? 'Numbered copy' : '',
    },
  };
}

export function candidateFromDiscogs(r: DiscogsSearchResult): Candidate {
  const full = r.title ?? '';
  const split = full.indexOf(' - ');
  const formatParts = [...(r.format ?? []), ...(r.formats ?? []).map((f) => f.text ?? '')].filter(Boolean);
  return {
    source: 'discogs',
    id: String(r.id),
    artist: split > 0 ? cleanName(full.slice(0, split)) : '',
    title: split > 0 ? full.slice(split + 3) : full,
    year: Number(r.year) || null,
    country: r.country ?? '',
    label: r.label?.[0] ?? '',
    catalogNumber: r.catno ?? '',
    formatText: [...new Set(formatParts)].join(', '),
    isVinyl: r.format?.includes('Vinyl') ?? false,
    thumbUrl: r.thumb || r.cover_image || '',
    barcode: r.barcode?.[0]?.replace(/\D/g, '') ?? '',
  };
}

function flattenTracks(list: DiscogsTrack[]): Track[] {
  return list.flatMap((t) => {
    if (t.type_ === 'heading') return [];
    if (t.sub_tracks?.length) return flattenTracks(t.sub_tracks);
    if (!t.title) return [];
    return [{ position: t.position ?? '', title: t.title, duration: t.duration ?? '', artist: joinArtists(t.artists) }];
  });
}

export function draftFromDiscogs(r: DiscogsRelease): ReleaseDraft {
  const image = r.images?.find((i) => i.type === 'primary') ?? r.images?.[0];
  const barcode = r.identifiers?.find((i) => i.type === 'Barcode')?.value?.replace(/\D/g, '') ?? '';
  return {
    artist: joinArtists(r.artists),
    title: r.title ?? '',
    year: r.year || null,
    country: r.country ?? '',
    label: cleanName(r.labels?.[0]?.name ?? ''),
    catalogNumber: r.labels?.[0]?.catno ?? '',
    barcode,
    genres: r.genres ?? [],
    styles: r.styles ?? [],
    ...pressingFromFormats(r.formats),
    tracklist: flattenTracks(r.tracklist ?? []),
    links: { discogsId: r.id, mbid: '', coverUrl: image?.uri ?? '' },
  };
}

// ---------- MusicBrainz ----------

export interface MbRelease {
  id: string;
  title?: string;
  date?: string;
  country?: string;
  barcode?: string | null;
  'artist-credit'?: { name: string; joinphrase?: string }[];
  'label-info'?: { 'catalog-number'?: string | null; label?: { name?: string } | null }[];
  media?: {
    format?: string | null;
    tracks?: {
      number?: string;
      title?: string;
      length?: number | null;
      'artist-credit'?: { name: string; joinphrase?: string }[];
    }[];
  }[];
}

const mbArtist = (credit: MbRelease['artist-credit']) =>
  (credit ?? []).map((c) => c.name + (c.joinphrase ?? '')).join('');

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function candidateFromMb(r: MbRelease): Candidate {
  const formats = [...new Set((r.media ?? []).map((m) => m.format ?? '').filter(Boolean))];
  return {
    source: 'musicbrainz',
    id: r.id,
    artist: mbArtist(r['artist-credit']),
    title: r.title ?? '',
    year: Number(r.date?.slice(0, 4)) || null,
    country: r.country ?? '',
    label: r['label-info']?.[0]?.label?.name ?? '',
    catalogNumber: r['label-info']?.[0]?.['catalog-number'] ?? '',
    formatText: formats.join(', '),
    isVinyl: formats.some((f) => /vinyl/i.test(f)),
    thumbUrl: `https://coverartarchive.org/release/${r.id}/front-250`,
    barcode: r.barcode ?? '',
  };
}

export function draftFromMb(r: MbRelease): ReleaseDraft {
  const c = candidateFromMb(r);
  const media = r.media ?? [];
  return {
    artist: c.artist,
    title: c.title,
    year: c.year,
    country: c.country,
    label: c.label,
    catalogNumber: c.catalogNumber,
    barcode: c.barcode,
    genres: [],
    styles: [],
    format: {
      size: /(7|10|12)"/.exec(c.formatText)?.[0] ?? '',
      speed: '',
      discs: media.filter((m) => /vinyl/i.test(m.format ?? '')).length || 1,
      text: c.formatText,
    },
    edition: { isSpecial: false, name: '', color: '', numbering: '', notes: '' },
    tracklist: media.flatMap((m) =>
      (m.tracks ?? []).map((t) => {
        const artist = mbArtist(t['artist-credit']);
        return {
          position: t.number ?? '',
          title: t.title ?? '',
          duration: formatDuration(t.length),
          artist: artist === c.artist ? '' : artist,
        };
      }),
    ),
    links: { discogsId: null, mbid: r.id, coverUrl: `https://coverartarchive.org/release/${r.id}/front-500` },
  };
}

// ---------- iTunes ----------

export interface ItunesItem {
  wrapperType?: string;
  collectionId?: number;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackName?: string;
  trackNumber?: number;
  discNumber?: number;
  discCount?: number;
  trackTimeMillis?: number;
}

export const itunesArtwork = (url: string | undefined, size: number) =>
  url ? url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`) : '';

export function candidateFromItunes(item: ItunesItem): Candidate {
  return {
    source: 'itunes',
    id: String(item.collectionId ?? ''),
    artist: item.artistName ?? '',
    title: item.collectionName ?? '',
    year: Number(item.releaseDate?.slice(0, 4)) || null,
    country: '',
    label: '',
    catalogNumber: '',
    formatText: 'Digital listing',
    isVinyl: false,
    thumbUrl: itunesArtwork(item.artworkUrl100, 300),
    barcode: '',
  };
}

export function draftFromItunes(items: ItunesItem[]): ReleaseDraft | null {
  const album = items.find((i) => i.wrapperType === 'collection');
  if (!album) return null;
  const songs = items
    .filter((i) => i.wrapperType === 'track')
    .sort((a, b) => (a.discNumber ?? 1) - (b.discNumber ?? 1) || (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
  const multiDisc = songs.some((s) => (s.discCount ?? 1) > 1);
  const c = candidateFromItunes(album);
  return {
    artist: c.artist,
    title: c.title,
    year: c.year,
    country: '',
    label: '',
    catalogNumber: '',
    barcode: '',
    genres: album.primaryGenreName ? [album.primaryGenreName] : [],
    styles: [],
    format: { size: '12"', speed: '33', discs: 1, text: '' },
    edition: { isSpecial: false, name: '', color: '', numbering: '', notes: '' },
    tracklist: songs.map((s) => ({
      position: multiDisc ? `${s.discNumber ?? 1}-${s.trackNumber ?? ''}` : String(s.trackNumber ?? ''),
      title: s.trackName ?? '',
      duration: formatDuration(s.trackTimeMillis),
      artist: s.artistName && s.artistName !== c.artist ? s.artistName : '',
    })),
    links: { discogsId: null, mbid: '', coverUrl: itunesArtwork(album.artworkUrl100, 600) },
  };
}
