import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GearIcon } from '../components/Icons';
import { ModeButton } from '../components/ModeButton';
import { CoverShelf } from '../components/shelf/CoverShelf';
import { CoverSlider } from '../components/shelf/CoverSlider';
import { SpineShelf } from '../components/shelf/SpineShelf';
import { sampleRecords } from '../data/sample';
import { allGenres, filterRecords, SORT_LABELS, sortRecords } from '../data/sort';
import type { SortKey } from '../data/types';
import { useApp } from '../state/AppContext';
import { NO_FILTER, readShelfState, writeShelfState, type ShelfState } from '../state/shelfState';
import { useCoverTheme } from '../theme/ThemeContext';
import { PHONE_LANDSCAPE, useMediaQuery } from '../theme/useMediaQuery';
import { useRecordColors } from '../theme/useRecordColors';

export function Shelf() {
  const { records, ready, settings, saveSettings, repo } = useApp();
  const [view, setView] = useState(readShelfState);
  const update = (patch: Partial<ShelfState>) => setView(writeShelfState(patch));
  const sideways = useMediaQuery(PHONE_LANDSCAPE);

  const genres = useMemo(() => allGenres(records), [records]);
  const filter = { ...view.filter, genre: genres.includes(view.filter.genre) ? view.filter.genre : '' };
  const shown = sortRecords(filterRecords(records, filter), settings.sort);
  const selected = shown.find((r) => r.id === view.selected) ?? shown[0];
  useCoverTheme(useRecordColors(selected));

  const loadSamples = async () => {
    for (const record of sampleRecords(settings.currency)) await repo.saveRecord(record, undefined);
  };
  const select = (id: string) => update({ selected: id });

  if (sideways && selected) {
    return (
      <CoverSlider
        records={shown}
        selectedId={selected.id}
        onSelect={select}
        sort={settings.sort}
        onSort={(sort) => {
          // The record in focus stays in focus when the order changes.
          select(selected.id);
          saveSettings({ sort });
        }}
        filtered={filter.specialOnly || filter.genre !== ''}
        onClearFilters={() => update({ filter: NO_FILTER })}
      />
    );
  }

  return (
    <div className="screen shelf-screen">
      <header className="page-head">
        <h1>
          Collection <span className="muted">{ready ? records.length : ''}</span>
        </h1>
        <div className="head-actions">
          <div className="segmented" role="group" aria-label="Shelf view">
            {(['spines', 'covers'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={settings.shelfView === v}
                onClick={() => saveSettings({ shelfView: v })}
              >
                {v === 'spines' ? 'Spines' : 'Covers'}
              </button>
            ))}
          </div>
          <ModeButton />
        </div>
      </header>

      <div className="chips">
        <Link className="chip chip-icon" to="/settings" aria-label="Settings">
          <GearIcon />
        </Link>
        {records.length > 0 && (
          <>
            <select
              className="chip"
              aria-label="Sort by"
              value={settings.sort}
              onChange={(e) => saveSettings({ sort: e.target.value as SortKey })}
            >
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              type="button"
              className="chip"
              aria-pressed={filter.specialOnly}
              onClick={() => update({ filter: { ...filter, specialOnly: !filter.specialOnly } })}
            >
              Special editions
            </button>
            {genres.length > 0 && (
              <select
                className="chip"
                aria-label="Genre"
                value={filter.genre}
                onChange={(e) => update({ filter: { ...filter, genre: e.target.value } })}
              >
                <option value="">All genres</option>
                {genres.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      {!ready ? (
        <p className="empty muted">Loading your shelf…</p>
      ) : records.length === 0 ? (
        <div className="empty">
          <h2>Your shelf is empty</h2>
          <p className="muted">Scan a barcode, photograph a cover, or type an album name to add your first record.</p>
          <Link className="button primary" to="/add">Add a record</Link>
          {repo.kind === 'local' && (
            <button type="button" className="button" onClick={loadSamples}>Try it with sample records</button>
          )}
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p className="muted">No records match these filters.</p>
          <button type="button" className="button" onClick={() => update({ filter: NO_FILTER })}>
            Clear filters
          </button>
        </div>
      ) : settings.shelfView === 'spines' ? (
        <SpineShelf records={shown} selectedId={selected.id} onSelect={select} />
      ) : (
        <CoverShelf records={shown} onOpen={select} />
      )}
    </div>
  );
}
