import type { Candidate, ReleaseDraft } from '../lookup/types';
import { emptyRecord, type VinylRecord } from './types';

/** A new record made straight from a search result, with no purchase details yet. */
export function quickRecord(draft: ReleaseDraft, candidate: Candidate, currency: string): VinylRecord {
  const base = emptyRecord(currency);
  return {
    ...base,
    ...draft,
    id: base.id,
    artist: (draft.artist || candidate.artist).trim() || 'Unknown artist',
    title: (draft.title || candidate.title).trim(),
    barcode: draft.barcode || candidate.barcode,
  };
}
