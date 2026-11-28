import { useDeferredValue, useMemo, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cover } from '../components/Cover';
import { SearchIcon } from '../components/Icons';
import { LargeTitle } from '../components/NavBar';
import { useRecordActions } from '../components/RecordMenu';
import { DiscogsResults, useDiscogsSearch } from '../components/search/DiscogsResults';
import { SwipeRow } from '../components/SwipeRow';
import { formatMoney } from '../data/stats';
import { useHold } from '../gestures/useHold';
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

const SOURCES = [
  { key: 'collection', label: 'Collection' },
  { key: 'discogs', label: 'Discogs' },
] as const;

export function Search() {
  const { records } = useApp();
  const hold = useHold();
  const { openMenu } = useRecordActions();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const tab = TABS.find((t) => t === params.get('show')) ?? 'all';
  const source = params.get('in') === 'discogs' ? 'discogs' : 'collection';
  const online = source === 'discogs';
  const deferred = useDeferredValue(query);
  const search = useMemo(() => createSearch(records), [records]);
  const results = useMemo(() => search(deferred), [search, deferred]);
  const discogs = useDiscogsSearch();
  const set = (q: string, show: string, where: string = source) =>
    setParams(
      { ...(q && { q }), ...(show !== 'all' && { show }), ...(where === 'discogs' && { in: where }) },
      { replace: true },
    );

  /** Switching to Discogs searches for what is already typed. */
  const switchTo = (where: (typeof SOURCES)[number]['key']) => {
    if (where === source) return;
    set(query, tab, where);
    if (where === 'discogs' && query.trim() !== discogs.found?.query) discogs.run(query);
  };

  // Your own collection is searched as you type; Discogs only when asked.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Return puts the keyboard away, as it does in iPhone search.
    document.getElementById('q')?.blur();
    if (online) discogs.run(query);
  };

  const counts = { all: results.songs.length + results.albums.length, songs: results.songs.length, albums: results.albums.length };

  return (
    <div className="screen">
      <LargeTitle
        title="Search"
        actions={
          <div className="segmented" role="group" aria-label="Where to search">
            {SOURCES.map(({ key, label }) => (
              <button key={key} type="button" aria-pressed={source === key} onClick={() => switchTo(key)}>
                {label}
              </button>
            ))}
          </div>
        }
      >
        <form id="search-form" className="search-field" role="search" onSubmit={submit}>
          <SearchIcon />
          <input
            id="q"
            type="search"
            aria-label={online ? 'Search Discogs' : 'Search your collection'}
            value={query}
            placeholder={online ? 'Artist, album, barcode…' : 'Artist, album, song, label…'}
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
            onChange={(e) => set(e.target.value, tab)}
          />
        </form>
        {!online && query.trim() && (
          <div className="segmented full" role="group" aria-label="Show">
            {TABS.map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => set(query, t)}>
                {t[0].toUpperCase() + t.slice(1)} {counts[t]}
              </button>
            ))}
          </div>
        )}
      </LargeTitle>

      {online ? (
        <div className="results">
          <DiscogsResults query={query} search={discogs} />
        </div>
      ) : (
        <div className="results">
          {!query.trim() ? (
            <p className="empty muted">
              Search your {records.length} records by artist, album, song, label, catalogue number, barcode, edition, tag or note.
            </p>
          ) : counts[tab] === 0 ? (
            <div className="empty">
              <p className="muted" role="status">Nothing on your shelf matches “{query}”.</p>
              <button type="button" className="button" onClick={() => switchTo('discogs')}>Search Discogs instead</button>
            </div>
          ) : null}

          {tab !== 'albums' && results.songs.length > 0 && (
            <section>
              <h2 className="section-label">Songs</h2>
              {results.songs.map(({ record, track, terms }) => (
                <Link
                  className="result song"
                  key={`${record.id}-${track.position}-${track.title}`}
                  to={`/record/${record.id}`}
                  draggable={false}
                  {...hold(() => openMenu(record))}
                >
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
                <SwipeRow record={record} key={record.id}>
                  <Link className="result" to={`/record/${record.id}`} draggable={false} {...hold(() => openMenu(record))}>
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
                </SwipeRow>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
