import { useEffect, useRef, useState, type FormEvent } from 'react';
import { searchReleases, type LookupResult } from '../../lookup/lookup';
import { useApp } from '../../state/AppContext';
import { Candidates } from './Candidates';
import { usePicker } from './usePicker';

let remembered: { query: string; result: LookupResult | null } = { query: '', result: null };

export function TypeTab() {
  const { settings } = useApp();
  const [query, setQuery] = useState(remembered.query);
  const [result, setResult] = useState(remembered.result);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const { pick, busyKey, error } = usePicker();
  useEffect(() => () => abort.current?.abort(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    abort.current?.abort();
    const controller = (abort.current = new AbortController());
    setBusy(true);
    setResult(null);
    try {
      const found = await searchReleases(query.trim(), settings.discogsToken, controller.signal);
      remembered = { query, result: found };
      setResult(found);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return (
    <div className="stack">
      <form className="row grow" onSubmit={submit}>
        <input
          type="search"
          aria-label="Artist and album, or catalogue number"
          placeholder="Artist and album"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="button primary" disabled={busy}>Search</button>
      </form>
      <p className="muted small" role="status">
        {busy ? 'Searching…' : result && !result.candidates.length ? 'Nothing found. Try fewer words.' : ''}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {result?.problems.map((p) => <p key={p} className="error small">{p}</p>)}
      {result && <Candidates candidates={result.candidates} onPick={pick} busyKey={busyKey} />}
    </div>
  );
}
