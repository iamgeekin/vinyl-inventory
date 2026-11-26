import type { VinylRecord } from './types';

export interface CurrencyTotal {
  currency: string;
  total: number;
  /** Records in this currency that have a price. */
  count: number;
  average: number;
  /** Spend per purchase year, oldest first. Undated purchases are listed last. */
  byYear: { year: string; total: number; count: number }[];
}

export const UNDATED = 'No date';

export function spendByCurrency(records: VinylRecord[]): CurrencyTotal[] {
  const groups = new Map<string, VinylRecord[]>();
  for (const r of records) {
    if (r.purchase.price === null) continue;
    const list = groups.get(r.purchase.currency) ?? [];
    list.push(r);
    groups.set(r.purchase.currency, list);
  }
  return [...groups]
    .map(([currency, list]) => {
      const years = new Map<string, { total: number; count: number }>();
      let cents = 0;
      for (const r of list) {
        const value = Math.round((r.purchase.price ?? 0) * 100);
        cents += value;
        const year = /^\d{4}/.exec(r.purchase.date)?.[0] ?? UNDATED;
        const entry = years.get(year) ?? { total: 0, count: 0 };
        entry.total += value;
        entry.count += 1;
        years.set(year, entry);
      }
      return {
        currency,
        total: cents / 100,
        count: list.length,
        average: Math.round(cents / list.length) / 100,
        byYear: [...years]
          .map(([year, v]) => ({ year, total: v.total / 100, count: v.count }))
          .sort((a, b) => (a.year === UNDATED ? 1 : b.year === UNDATED ? -1 : a.year.localeCompare(b.year))),
      };
    })
    .sort((a, b) => b.count - a.count || a.currency.localeCompare(b.currency));
}

export function topArtists(records: VinylRecord[], limit = 5): { artist: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.artist, (counts.get(r.artist) ?? 0) + 1);
  return [...counts]
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count || a.artist.localeCompare(b.artist))
    .slice(0, limit);
}

export function formatMoney(value: number | null, currency: string): string {
  if (value === null) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso || '—';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
