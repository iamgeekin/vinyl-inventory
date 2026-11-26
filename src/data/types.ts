import { isHex } from '../theme/color';
import type { Appearance } from '../theme/palette';

export const GRADES =['', 'M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const;
export type Grade = (typeof GRADES)[number];

export interface Track {
  position: string;
  title: string;
  duration: string;
  artist: string;
}

export interface VinylRecord {
  id: string;
  artist: string;
  title: string;
  year: number | null;
  country: string;
  label: string;
  catalogNumber: string;
  barcode: string;
  genres: string[];
  styles: string[];
  format: { size: string; speed: string; discs: number; text: string };
  edition: { isSpecial: boolean; name: string; color: string; numbering: string; notes: string };
  purchase: { price: number | null; currency: string; date: string; store: string };
  condition: { media: Grade; sleeve: Grade };
  rating: number;
  notes: string;
  tags: string[];
  tracklist: Track[];
  links: { discogsId: number | null; mbid: string; coverUrl: string };
  /** The cover's main colour. */
  spineColor: string;
  /** The cover's second colour, used for highlights. */
  popColor: string;
  /** 0 means no stored thumbnail. Changes whenever the thumbnail changes. */
  coverVersion: number;
  createdAt: number;
  updatedAt: number;
}

export type SortKey = 'artist' | 'title' | 'year' | 'purchased' | 'price';
export type ShelfView = 'spines' | 'covers';

export interface Settings {
  currency: string;
  discogsToken: string;
  shelfView: ShelfView;
  sort: SortKey;
  appearance: Appearance;
}

export function newId(): string {
  return crypto.randomUUID();
}

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', SG: 'SGD', MY: 'MYR', AU: 'AUD', NZ: 'NZD', CA: 'CAD', JP: 'JPY',
  HK: 'HKD', TW: 'TWD', CN: 'CNY', KR: 'KRW', IN: 'INR', ID: 'IDR', PH: 'PHP', TH: 'THB',
  VN: 'VND', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', DE: 'EUR', FR: 'EUR', IT: 'EUR',
  ES: 'EUR', NL: 'EUR', IE: 'EUR',
};

export function guessCurrency(locale: string | undefined): string {
  const region = locale?.split('-').find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part));
  return (region && REGION_CURRENCY[region]) || 'USD';
}

export const CURRENCIES = [...new Set(Object.values(REGION_CURRENCY))].sort();

export function defaultSettings(): Settings {
  return {
    currency: guessCurrency(globalThis.navigator?.language),
    discogsToken: '',
    shelfView: 'spines',
    sort: 'artist',
    appearance: 'auto',
  };
}

export function emptyRecord(currency = 'USD'): VinylRecord {
  const now = Date.now();
  return {
    id: newId(),
    artist: '',
    title: '',
    year: null,
    country: '',
    label: '',
    catalogNumber: '',
    barcode: '',
    genres: [],
    styles: [],
    format: { size: '12"', speed: '33', discs: 1, text: '' },
    edition: { isSpecial: false, name: '', color: '', numbering: '', notes: '' },
    purchase: { price: null, currency, date: '', store: '' },
    condition: { media: '', sleeve: '' },
    rating: 0,
    notes: '',
    tags: [],
    tracklist: [],
    links: { discogsId: null, mbid: '', coverUrl: '' },
    spineColor: '',
    popColor: '',
    coverVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};

/** Turns stored or imported data of unknown shape into a complete record. */
export function normalizeRecord(input: unknown): VinylRecord {
  const r = obj(input);
  const base = emptyRecord();
  const format = obj(r.format);
  const edition = obj(r.edition);
  const purchase = obj(r.purchase);
  const condition = obj(r.condition);
  const links = obj(r.links);
  const grade = (v: unknown): Grade => (GRADES as readonly string[]).includes(str(v)) ? (str(v) as Grade) : '';
  return {
    id: str(r.id) || base.id,
    artist: str(r.artist),
    title: str(r.title),
    year: num(r.year),
    country: str(r.country),
    label: str(r.label),
    catalogNumber: str(r.catalogNumber),
    barcode: str(r.barcode),
    genres: strList(r.genres),
    styles: strList(r.styles),
    format: {
      size: str(format.size),
      speed: str(format.speed),
      discs: num(format.discs) ?? 1,
      text: str(format.text),
    },
    edition: {
      isSpecial: edition.isSpecial === true,
      name: str(edition.name),
      color: str(edition.color),
      numbering: str(edition.numbering),
      notes: str(edition.notes),
    },
    purchase: {
      price: num(purchase.price),
      currency: /^[A-Z]{3}$/.test(str(purchase.currency)) ? str(purchase.currency) : base.purchase.currency,
      date: str(purchase.date),
      store: str(purchase.store),
    },
    condition: { media: grade(condition.media), sleeve: grade(condition.sleeve) },
    rating: Math.min(5, Math.max(0, num(r.rating) ?? 0)),
    notes: str(r.notes),
    tags: strList(r.tags),
    tracklist: (Array.isArray(r.tracklist) ? r.tracklist : []).map((t) => {
      const track = obj(t);
      return {
        position: str(track.position),
        title: str(track.title),
        duration: str(track.duration),
        artist: str(track.artist),
      };
    }),
    links: { discogsId: num(links.discogsId), mbid: str(links.mbid), coverUrl: str(links.coverUrl) },
    spineColor: isHex(str(r.spineColor)) ? str(r.spineColor) : '',
    popColor: isHex(str(r.popColor)) ? str(r.popColor) : '',
    coverVersion: num(r.coverVersion) ?? 0,
    createdAt: num(r.createdAt) ?? base.createdAt,
    updatedAt: num(r.updatedAt) ?? base.updatedAt,
  };
}
