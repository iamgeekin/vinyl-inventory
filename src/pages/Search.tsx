import { useDeferredValue, useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { formatMoney } from '../data/stats';
import { normalizeText } from '../lookup/text';
import { createSearch } from '../search';
import { useApp } from '../state/AppContext';

/** Marks the parts of words that start with a matched term. */
function highlight(text: string, terms: string[]): ReactNode {
  return text.split(/(\s+)/).map((word, i) => {
    const plain = normalizeText(word);
    const term = terms.filter((t) => plain.startsWith(t)).sort((a, b) => b.length - a.length)[0];
    if (!term) return word;
    // Only split the word when its letters line up one-to-one with the normalised form.
    if (word.toLowerCase().startsWith(term)) {
      return (
        <span key={i}>
          <mark>{word.slice(0, term.length)}</mark>
          {word.slice(term.length)}
        </span>
      );
    }
    return <mark key={i}>{word}</mark>;
  });
}

/** "B2" reads as "Side B, track 2". */
function placeOf(position: string): string {
  const side = /^([A-Z])(\d+)$/i.exec(position);
  return side ? `Side ${side[1].toUpperCase()}, track ${side[2]}` : `Track ${position}`;
}

const TABS = ['all', 'songs', 'albums'] as const;

export function Search() {
  const { records } = useApp();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const tab = TABS.find((t) => t === params.get('show')) ?? 'all';
  const deferred = useDeferredValue(query);
  const search = useMemo(() => createSearch(records), [records]);
  const results = useMemo(() => search(deferred), [search, deferred]);
  const set = (q: string, show: string) =>
    setParams({ ...(q && { q }), ...(show !== 'all' && { show }) }, { replace: true });

  const counts = { all: results.songs.length + results.albums.length, songs: results.songs.length, albums: results.albums.length };

  return (
    <div className="screen">
      <header className="page-head stack">
        <h1><label htmlFor="q">Search</label></h1>
        <input
          id="q"
          className="search-input"
          type="search"
          value={query}
          placeholder="Artist, album, song, label…"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => set(e.target.value, tab)}
        />
        {query.trim() && (
          <div className="chips flush" role="group" aria-label="Show">
            {TABS.map((t) => (
              <button key={t} type="button" className="chip solid" aria-pressed={tab === t} onClick={() => set(query, t)}>
                {t[0].toUpperCase() + t.slice(1)} {counts[t]}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="results">
        {!query.trim() ? (
          <p className="empty muted">
            Search your {records.length} records by artist, album, song, label, catalogue number, barcode, edition, tag or note.
          </p>
        ) : counts[tab] === 0 ? (
          <p className="empty muted" role="status">Nothing on your shelf matches “{query}”.</p>
        ) : null}

        {tab !== 'albums' && results.songs.length > 0 && (
          <section>
            <h2 className="section-label">Songs</h2>
            {results.songs.map(({ record, track, terms }) => (
              <Link className="result song" key={`${record.id}-${track.position}-${track.title}`} to={`/record/${record.id}`}>
                <span className="result-main">
                  <Cover record={record} alt="" />
                  <span>
                    <span className="result-title">{highlight(track.title, terms)}</span>
                    <span className="muted small">{[track.artist || record.artist, track.duration].filter(Boolean).join(' · ')}</span>
                  </span>
                </span>
                <span className="result-foot small">
                  <span className="muted">{record.title}</span>
                  {track.position && <span className="accent">{placeOf(track.position)}</span>}
                </span>
              </Link>
            ))}
          </section>
        )}

        {tab !== 'songs' && results.albums.length > 0 && (
          <section>
            <h2 className="section-label">Albums</h2>
            {results.albums.map(({ record, terms }) => (
              <Link className="result" key={record.id} to={`/record/${record.id}`}>
                <span className="result-main">
                  <Cover record={record} alt="" />
                  <span>
                    <span className="result-title">{highlight(record.title, terms)}</span>
                    <span className="muted small">{highlight(record.artist, terms)}{record.year ? ` · ${record.year}` : ''}</span>
                    <span className="muted small">
                      {[record.edition.name || record.edition.color, record.purchase.price !== null && formatMoney(record.purchase.price, record.purchase.currency)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
