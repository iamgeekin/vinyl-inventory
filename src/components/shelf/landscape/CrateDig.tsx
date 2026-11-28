import { useMemo, type CSSProperties } from 'react';
import { groupLabels, sortMark } from '../../../data/sort';
import { formatDate, formatMoney } from '../../../data/stats';
import { useHold } from '../../../gestures/useHold';
import { fallbackColor } from '../../colors';
import { Cover } from '../../Cover';
import { useRecordActions } from '../../RecordMenu';
import { useSize } from '../useSize';
import { BEHIND, CRATE_FLOOR, OVERHANG, crateFit, cratePose, indexEntries, litEntry } from './layout';
import { DeckHeader, StepButton, Vinyl, type LandscapeProps } from './parts';
import { useDeck, useDeckDrag, useScrub } from './useDeck';

/** Height of one line of the side index. */
const INDEX_LINE = 14;

/**
 * A crate seen from the front: sleeves tip forward one at a time, and the rest
 * wait behind. An index down the side jumps to a letter, year or price.
 */
export function CrateDig(props: LandscapeProps) {
  const { records, selectedId, onSelect, sort } = props;
  const deck = useDeck(records, selectedId, onSelect);
  const { index, position } = deck;
  const record = records[index];
  const hold = useHold();
  const { openMenu } = useRecordActions();
  const [crateRef, crate] = useSize({ width: 450, height: 300 });
  const [indexRef, indexSize] = useSize({ width: 56, height: 300 });
  const { size, step, left } = crateFit(crate.width, crate.height);
  // Down flips the front sleeve towards you, as in a real crate.
  const drag = useDeckDrag(deck, { axis: 'y', forward: 1, perItem: 46 });

  /** The runs of records filed under one name, in order. */
  const groups = useMemo(() => {
    const runs: { name: string; at: number }[] = [];
    groupLabels(records, sort).forEach((name, at) => {
      if (name !== runs[runs.length - 1]?.name) runs.push({ name, at });
    });
    return runs;
  }, [records, sort]);
  const groupStarts = useMemo(() => new Map(groups.map((g, number) => [g.at, number])), [groups]);
  const current = groups.reduce((found, g, number) => (g.at <= index ? number : found), 0);
  const entries = indexEntries(groups.length, Math.max(5, Math.floor((indexSize.height - 8) / INDEX_LINE)));
  const lit = litEntry(entries, current);

  const side = useScrub(deck, (e) => {
    const lines = e.currentTarget.querySelectorAll('.crate-mark');
    const top = lines[0].getBoundingClientRect().top;
    const bottom = lines[lines.length - 1].getBoundingClientRect().bottom;
    const number = Math.floor(((e.clientY - top) / (bottom - top)) * groups.length);
    return groups[Math.max(0, Math.min(groups.length - 1, number))].at;
  });

  const first = Math.max(0, Math.floor(position) - 4);
  // Letters are shown as filed, so a name that starts with a digit reads "#".
  const mark = sort === 'artist' || sort === 'title' ? groups[current].name : sortMark(record, sort);
  const extra = record.edition.name || record.edition.color || (record.format.discs > 1 ? `${record.format.discs} discs` : '');

  return (
    <div className="deck">
      <DeckHeader {...props} deck={deck} />

      <div className="crate-body">
        <div
          className="crate"
          ref={crateRef}
          role="group"
          aria-label="Crate. Swipe down for the next record, up for the previous one, or use the arrow keys."
          tabIndex={0}
          onKeyDown={deck.onKeyDown}
          style={{ '--size': `${size}px`, '--left': `${left}px`, '--floor': `${CRATE_FLOOR}px` } as CSSProperties}
          {...drag}
        >
          <div className="crate-glow" aria-hidden="true" />
          {records.slice(first, Math.ceil(position) + BEHIND + 1).map((r, offset) => {
            const i = first + offset;
            const distance = i - position;
            const pose = cratePose(distance, step);
            const focused = i === index;
            const settled = i === position;
            const group = groupStarts.get(i);
            return (
              <div
                key={r.id}
                className="crate-sleeve"
                style={{
                  transform: `translate3d(0, ${pose.y}px, ${pose.z}px) rotateX(${pose.tilt}deg)`,
                  opacity: pose.opacity,
                  visibility: pose.opacity ? 'visible' : 'hidden',
                  zIndex: distance <= -0.5 ? Math.round(150 + distance) : Math.round(100 - distance * 2),
                }}
              >
                {group !== undefined && (
                  // Tabs step across the crate so that neighbouring ones stay readable.
                  <span className="crate-tab" style={{ left: `${8 + (group % 4) * 22}%` }} aria-hidden="true">{groups[group].name}</span>
                )}
                <Vinyl
                  record={r}
                  spinning={settled}
                  style={{ transform: settled ? `translateX(${size * OVERHANG}px)` : 'none', opacity: Math.abs(distance) < 0.5 ? 1 : 0 }}
                />
                <button
                  type="button"
                  className="crate-face"
                  tabIndex={focused ? 0 : -1}
                  aria-label={`${focused ? 'Open' : 'Show'} ${r.title} by ${r.artist}`}
                  style={{ background: r.spineColor || fallbackColor(`${r.artist}${r.title}`) }}
                  {...hold(() => openMenu(r))}
                  onClick={() => (focused ? deck.open() : deck.go(i))}
                >
                  <Cover record={r} alt="" />
                </button>
                <span className="crate-dim" style={{ opacity: pose.dim }} />
              </div>
            );
          })}
          <div className="crate-front" aria-hidden="true">
            <i />
            <b>{mark}</b>
            <i />
          </div>
        </div>

        <section className="crate-panel">
          <div className="deck-names" aria-live="polite">
            <p className="deck-title">{record.title}</p>
            <p className="crate-artist">{record.artist}</p>
            {extra && <p className="accent small">{extra}</p>}
          </div>
          <dl className="crate-facts">
            <div><dt>Year</dt><dd>{record.year ?? '—'}</dd></div>
            <div className="wide"><dt>Bought</dt><dd>{formatDate(record.purchase.date)}</dd></div>
            <div><dt>Paid</dt><dd>{formatMoney(record.purchase.price, record.purchase.currency)}</dd></div>
            <div className="wide"><dt>Genre</dt><dd>{record.genres[0] ?? '—'}</dd></div>
          </dl>
          <div className="crate-actions">
            <StepButton deck={deck} step={-1} />
            <button type="button" className="button primary" onClick={deck.open}>Open</button>
            <StepButton deck={deck} step={1} />
          </div>
        </section>

        <div
          className={side.scrubbing ? 'crate-index is-scrubbing' : 'crate-index'}
          ref={indexRef}
          role="slider"
          tabIndex={0}
          aria-label="Jump to a group"
          aria-orientation="vertical"
          aria-valuemin={1}
          aria-valuemax={groups.length}
          aria-valuenow={current + 1}
          aria-valuetext={groups[current].name}
          onKeyDown={(e) => {
            const to = { ArrowUp: current - 1, ArrowLeft: current - 1, ArrowDown: current + 1, ArrowRight: current + 1, Home: 0, End: groups.length - 1 }[e.key];
            if (to === undefined) return;
            e.preventDefault();
            deck.go(groups[Math.max(0, Math.min(groups.length - 1, to))].at);
          }}
          {...side.handlers}
        >
          {entries.map((entry, n) => {
            // A dot standing for the current group spells it out.
            const named = entry.named || n === lit;
            return (
              <span
                key={`${entry.group}-${entry.named}`}
                className={`crate-mark${named ? '' : ' is-dot'}${n === lit ? ' is-current' : ''}`}
                aria-hidden="true"
              >
                {named ? groups[n === lit ? current : entry.group].name : '•'}
              </span>
            );
          })}
          {side.scrubbing && (
            <span className="deck-bubble" style={{ top: `clamp(1.5rem, ${((lit + 0.5) / entries.length) * 100}%, 100% - 1.5rem)` }}>
              {mark}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
