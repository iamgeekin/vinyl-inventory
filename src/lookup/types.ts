import type { VinylRecord } from '../data/types';

export type Source = 'discogs' | 'musicbrainz' | 'itunes';

export const SOURCE_NAMES: Record<Source, string> = {
  discogs: 'Discogs',
  musicbrainz: 'MusicBrainz',
  itunes: 'iTunes',
};

/** One search result, before the full release details are loaded. */
export interface Candidate {
  source: Source;
  id: string;
  artist: string;
  title: string;
  year: number | null;
  country: string;
  label: string;
  catalogNumber: string;
  formatText: string;
  isVinyl: boolean;
  thumbUrl: string;
  barcode: string;
}

export type ReleaseDraft = Pick<
  VinylRecord,
  | 'artist' | 'title' | 'year' | 'country' | 'label' | 'catalogNumber' | 'barcode'
  | 'genres' | 'styles' | 'format' | 'edition' | 'tracklist' | 'links'
>;
