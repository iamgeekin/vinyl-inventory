import { formatMoney } from './stats';
import type { SortKey, VinylRecord } from './types';

export const SORT_LABELS: Record<SortKey, string> = {
  artist: 'Artist A–Z',
  title: 'Album A–Z',
  year: 'Newest release',
  purchased: 'Recently bought',
  price: 'Highest price',
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const artistKey = (r: VinylRecord) => r.artist.replace(/^(the|a|an)\s+/i, '');

export function sortRecords(records: VinylRecord[], key: SortKey): VinylRecord[] {
  const byArtist = (a: VinylRecord, b: VinylRecord) =>
    collator.compare(artistKey(a), artistKey(b)) || (a.year ?? 0) - (b.year ?? 0) || collator.compare(a.title, b.title);
  const compare: Record<SortKey, (a: VinylRecord, b: VinylRecord) => number> = {
    artist: byArtist,
    title: (a, b) => collator.compare(a.title, b.title) || byArtist(a, b),
    year: (a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity) || byArtist(a, b),
    purchased: (a, b) => b.purchase.date.localeCompare(a.purchase.date) || b.createdAt - a.createdAt,
    price: (a, b) => (b.purchase.price ?? -1) - (a.purchase.price ?? -1) || byArtist(a, b),
  };
  return [...records].sort(compare[key]);
}

export const SHORT_SORT_LABELS: Record<SortKey, string> = {
  artist: 'Artist',
  title: 'Title',
  year: 'Year',
  purchased: 'Bought',
  price: 'Price',
};

/** Where a record sits in the chosen order, for example "M", "2021" or "Jun 2026". */
export function sortMark(record: VinylRecord, key: SortKey): string {
  const initial = (text: string) => [...text.trim()][0]?.toUpperCase() ?? '—';
  if (key === 'artist') return initial(artistKey(record));
  if (key === 'title') return initial(record.title);
  if (key === 'year') return record.year ? String(record.year) : '—';
  if (key === 'price') return formatMoney(record.purchase.price, record.purchase.currency);
  const date = /^(\d{4})-(\d{2})/.exec(record.purchase.date);
  if (!date) return '—';
  return new Date(Number(date[1]), Number(date[2]) - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** The nearest 1, 2 or 5 times a power of ten that is no smaller than `value`. */
function roundStep(value: number): number {
  if (value <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].find((m) => value <= m * power)! * power;
}

function wholeMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

/**
 * The group each record is filed under in the chosen order, for divider cards and
 * the index: a letter, a year, a quarter such as "Q2 ’26", or a price band such
 * as "$30+".
 */
export function groupLabels(records: VinylRecord[], key: SortKey): string[] {
  if (key === 'price') {
    const priced = records.filter((r) => r.purchase.price !== null);
    // Round bands in whatever the prices are counted in, tens of dollars or thousands of yen.
    const step = roundStep(priced.reduce((top, r) => Math.max(top, r.purchase.price!), 0) / 8);
    const mixed = new Set(priced.map((r) => r.purchase.currency)).size > 1;
    return records.map(({ purchase: { price, currency } }) => {
      if (price === null) return '—';
      const low = Math.floor(price / step) * step;
      return `${mixed ? low : wholeMoney(low, currency)}+`;
    });
  }
  return records.map((r) => {
    if (key === 'year') return sortMark(r, key);
    if (key === 'purchased') {
      const date = /^\d{2}(\d{2})-(\d{2})/.exec(r.purchase.date);
      return date ? `Q${Math.ceil(Number(date[2]) / 3)} ’${date[1]}` : '—';
    }
    // Accented letters are filed with their plain ones, as the sort order has them.
    const initial = sortMark(r, key).normalize('NFD')[0];
    return /\p{L}/u.test(initial) ? initial : '#';
  });
}

export interface Filter {
  genre: string;
  specialOnly: boolean;
}

export function filterRecords(records: VinylRecord[], filter: Filter): VinylRecord[] {
  return records.filter(
    (r) => (!filter.specialOnly || r.edition.isSpecial) && (!filter.genre || r.genres.includes(filter.genre)),
  );
}

export function allGenres(records: VinylRecord[]): string[] {
  return [...new Set(records.flatMap((r) => r.genres))].sort(collator.compare);
}
