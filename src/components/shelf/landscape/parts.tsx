import type { CSSProperties } from 'react';
import { SHORT_SORT_LABELS } from '../../../data/sort';
import type { SortKey, VinylRecord } from '../../../data/types';
import { discColor, grooves } from '../../colors';
import { NextIcon, PreviousIcon } from '../../Icons';
import { ModeButton } from '../../ModeButton';
import type { Deck } from './useDeck';

/** What the shelf hands to either sideways layout. */
export interface LandscapeProps {
  /** In the order to show them. Must not be empty. */
  records: VinylRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  filtered: boolean;
  onClearFilters: () => void;
}

export function DeckHeader({ deck, sort, onSort, filtered, onClearFilters }: LandscapeProps & { deck: Deck }) {
  return (
    <header className="deck-head">
      <h1>
        Collection <span className="muted">{deck.index + 1} of {deck.records.length}</span>
      </h1>
      {filtered && (
        <button type="button" className="chip" onClick={onClearFilters}>Clear filters</button>
      )}
      <div className="deck-sorts segmented" role="group" aria-label="Sort by">
        {Object.entries(SHORT_SORT_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sort === key}
            onClick={() => {
              // Comes to rest first, so that the record in focus is the one that stays.
              deck.stop();
              deck.move(Math.round(deck.live.current.position));
              onSort(key as SortKey);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <ModeButton />
    </header>
  );
}

export function StepButton({ deck, step }: { deck: Deck; step: 1 | -1 }) {
  const to = deck.index + step;
  return (
    <button
      type="button"
      className="mode-button"
      aria-label={step < 0 ? 'Previous record' : 'Next record'}
      disabled={to < 0 || to >= deck.records.length}
      onClick={() => deck.go(to)}
    >
      {step < 0 ? <PreviousIcon /> : <NextIcon />}
    </button>
  );
}

/** The disc that slides out from behind a sleeve, in the colour of its pressing. */
export function Vinyl({ record, spinning, style }: { record: VinylRecord; spinning: boolean; style: CSSProperties }) {
  return (
    <span
      className={spinning ? 'vinyl is-spinning' : 'vinyl'}
      style={{ ...style, '--label': record.popColor || 'var(--fill)' } as CSSProperties}
      aria-hidden="true"
    >
      <span style={{ background: grooves(discColor(record.edition.color)) }} />
    </span>
  );
}
