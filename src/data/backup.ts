import { normalizeRecord, type VinylRecord } from './types';

export interface Backup {
  app: 'vinyl-inventory';
  version: 1;
  exportedAt: string;
  records: VinylRecord[];
  covers: Record<string, string>;
}

export function buildBackup(records: VinylRecord[], covers: Record<string, string>, now = new Date()): Backup {
  return { app: 'vinyl-inventory', version: 1, exportedAt: now.toISOString(), records, covers };
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const d = data as Partial<Backup> | null;
  if (!d || d.app !== 'vinyl-inventory' || !Array.isArray(d.records)) {
    throw new Error('This file is not a Vinyl Inventory backup.');
  }
  if (d.version !== 1) throw new Error('This backup was made by a newer version of the app.');
  const covers: Record<string, string> = {};
  for (const [id, value] of Object.entries(d.covers ?? {})) {
    if (typeof value === 'string' && value.startsWith('data:image/')) covers[id] = value;
  }
  const records = d.records.map(normalizeRecord).filter((r) => r.title || r.artist);
  return { app: 'vinyl-inventory', version: 1, exportedAt: String(d.exportedAt ?? ''), records, covers };
}

/** Quotes a CSV cell and stops spreadsheet apps from running it as a formula. */
export function csvCell(value: string | number | null): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(records: VinylRecord[]): string {
  const header = [
    'Artist', 'Title', 'Year', 'Label', 'Catalog number', 'Barcode', 'Format', 'Edition', 'Vinyl colour',
    'Numbering', 'Price', 'Currency', 'Purchase date', 'Store', 'Media', 'Sleeve', 'Genres', 'Tags', 'Notes', 'Tracklist',
  ];
  const rows = records.map((r) => [
    r.artist, r.title, r.year, r.label, r.catalogNumber, r.barcode,
    [r.format.size, r.format.speed && `${r.format.speed} rpm`, r.format.text].filter(Boolean).join(', '),
    r.edition.name, r.edition.color, r.edition.numbering, r.purchase.price, r.purchase.currency, r.purchase.date,
    r.purchase.store, r.condition.media, r.condition.sleeve, r.genres.join('; '), r.tags.join('; '), r.notes,
    r.tracklist.map((t) => [t.position, t.title].filter(Boolean).join(' ')).join('; '),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
