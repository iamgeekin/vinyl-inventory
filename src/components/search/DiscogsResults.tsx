import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { findOwned, searchDiscogs, type LookupResult } from '../../lookup/lookup';
import type { Candidate } from '../../lookup/types';
import { useApp } from '../../state/AppContext';
import { Candidates, candidateKey } from '../add/Candidates';
import { usePicker } from '../add/usePicker';
import { ConfirmDialog } from '../ConfirmDialog';
import { useQuickAdd } from './useQuickAdd';

interface Found {
  query: string;
  result: LookupResult;
}

// Kept so that coming back from a record or another tab does not search again.
let remembered: Found | null = null;

/** Runs a Discogs search when asked to, and keeps the last one. */
export function useDiscogsSearch() {
  const { settings } = useApp();
  const [found, setFound] = useState(remembered);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(
    async (input: string) => {
      const query = input.trim();
      if (!query) return;
      abort.current?.abort();
      const controller = (abort.current = new AbortController());
      setBusy(true);
      setFound(null);
      try {
        const result = await searchDiscogs(query, settings.discogsToken, controller.signal);
        // A failed search is not remembered, so it is tried again next time.
        remembered = result.problems.length ? null : { query, result };
        setFound({ query, result });
        setBusy(false);
      } catch (e) {
        if (!controller.signal.aborted) throw e;
      }
    },
    [settings.discogsToken],
  );

  return { found, busy, run };
}

/** Discogs releases, each of which can be added at once or opened to fill in first. */
export function DiscogsResults({ query, search }: { query: string; search: ReturnType<typeof useDiscogsSearch> }) {
  const { records, settings } = useApp();
  const { pick, busyKey, error } = usePicker();
  const { add, status } = useQuickAdd();
  const [another, setAnother] = useState<Candidate | null>(null);
  const { found, busy } = search;
  const typed = query.trim();
  const candidates = found?.result.candidates ?? [];

  const ownedBy = (c: Candidate) =>
    findOwned(records, { ...c, links: { discogsId: Number(c.id) } });

  const note = (c: Candidate) => {
    const owned = ownedBy(c);
    if (!owned.length) return '';
    return owned.some((r) => r.links.discogsId === Number(c.id)) ? 'In your collection' : 'You have this album';
  };

  const action = (c: Candidate) => {
    const state = status(candidateKey(c));
    if (state.added) {
      return (
        <Link className="button quick-add" to={`/record/${state.added}`} aria-label={`View ${c.title}, now in your collection`}>
          View
        </Link>
      );
    }
    return (
      <button
        type="button"
        className="button primary quick-add"
        disabled={state.busy || Boolean(busyKey)}
        aria-label={`Add ${c.title} by ${c.artist} to your collection`}
        onClick={() => (ownedBy(c).length ? setAnother(c) : add(c))}
      >
        {state.busy ? 'Adding…' : 'Add'}
      </button>
    );
  };

  const failures = candidates.map((c) => status(candidateKey(c)).error).filter(Boolean);

  return (
    <>
      {typed && typed !== found?.query && !busy && (
        <button type="submit" form="search-form" className="button primary wide">Search Discogs for “{typed}”</button>
      )}
      {!typed && !found && (
        <p className="empty muted">Search Discogs by artist, album, catalogue number or barcode, then add a record to your collection.</p>
      )}
      {!settings.discogsToken && (
        <p className="muted small">
          Searching works better with a token: it adds cover pictures and allows more requests. <Link to="/settings">Add one in Settings</Link>.
        </p>
      )}
      <p className="muted small" role="status">
        {busy ? 'Searching Discogs…' : found && !candidates.length && !found.result.problems.length ? `Nothing on Discogs matches “${found.query}”.` : ''}
      </p>
      {found?.result.problems.map((p) => <p key={p} className="error small" role="alert">{p}</p>)}
      {[...new Set([error, ...failures].filter(Boolean))].map((p) => <p key={p} className="error small" role="alert">{p}</p>)}

      {candidates.length > 0 && (
        <section>
          <h2 className="section-label">Discogs releases of “{found!.query}”</h2>
          <Candidates candidates={candidates} onPick={pick} busyKey={busyKey} note={note} action={action} />
        </section>
      )}

      {another && (
        <ConfirmDialog
          title="Add another copy?"
          confirmLabel="Add"
          destructive={false}
          onCancel={() => setAnother(null)}
          onConfirm={() => {
            add(another);
            setAnother(null);
          }}
        >
          {ownedBy(another)[0]?.title} by {ownedBy(another)[0]?.artist} is already in your collection.
        </ConfirmDialog>
      )}
    </>
  );
}
