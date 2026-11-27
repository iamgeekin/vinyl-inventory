import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { VinylRecord } from '../data/types';
import { discogsByText } from '../lookup/discogs';
import { discogsMatches, type LookupResult } from '../lookup/lookup';
import type { Candidate } from '../lookup/types';
import { Candidates } from './add/Candidates';

interface Props {
  record: VinylRecord;
  token: string;
  onPick: (candidate: Candidate) => void;
}

/** Finds the Discogs release for a record that is not linked to one. */
export function DiscogsLink({ record, token, onPick }: Props) {
  const [query, setQuery] = useState(() => `${record.artist} ${record.title}`.trim());
  const [result, setResult] = useState<LookupResult | null>(null);
  const abort = useRef<AbortController | null>(null);
  const { artist, title, barcode } = record;

  const run = useCallback((search: (signal: AbortSignal) => Promise<LookupResult>) => {
    abort.current?.abort();
    const controller = (abort.current = new AbortController());
    setResult(null);
    search(controller.signal).then(
      (found) => !controller.signal.aborted && setResult(found),
      (e: Error) => !controller.signal.aborted && setResult({ candidates: [], problems: [e.message] }),
    );
  }, []);

  useEffect(() => {
    run((signal) => discogsMatches({ artist, title, barcode }, token, signal));
    return () => abort.current?.abort();
  }, [run, artist, title, barcode, token]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    run(async (signal) => ({ candidates: await discogsByText(query.trim(), token, signal), problems: [] }));
  };

  return (
    <div className="stack">
      <form className="row grow" onSubmit={submit}>
        <input
          type="search"
          aria-label="Search Discogs by artist, album or catalogue number"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="button">Search</button>
      </form>
      <p className="muted small" role="status">
        {!result
          ? 'Searching…'
          : result.candidates.length
            ? 'Tap the pressing you own.'
            : result.problems.length
              ? ''
              : 'Nothing found. Try fewer words or the catalogue number.'}
      </p>
      {result?.problems.map((p) => <p key={p} className="error small">{p}</p>)}
      {result && <Candidates candidates={result.candidates} onPick={onPick} />}
    </div>
  );
}
