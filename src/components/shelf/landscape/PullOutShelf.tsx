import { useMemo } from 'react';
import { groupLabels, sortMark } from '../../../data/sort';
import { formatMoney } from '../../../data/stats';
import { useHold } from '../../../gestures/useHold';
import { fallbackColor, readableOn } from '../../colors';
import { Cover } from '../../Cover';
import { useRecordActions } from '../../RecordMenu';
import { spineWidth } from '../SpineShelf';
import { useSize } from '../useSize';
import { DIVIDER, MARGIN, OVERHANG, pullOutSize, shelfLayout } from './layout';
import { DeckHeader, StepButton, Vinyl, type LandscapeProps } from './parts';
import { useDeck, useDeckDrag, useScrub } from './useDeck';

/** How many records either side of the focus have their cover ready to swing out. */
const READY = 2;

const colorOf = (color: string, key: string) => color || fallbackColor(key);

/**
 * A shelf of spines seen sideways. The record in the middle swings out as its
 * cover with the disc slid out, and turns back into a spine as it moves on.
 */
export function PullOutShelf(props: LandscapeProps) {
  const { records, selectedId, onSelect, sort } = props;
  const deck = useDeck(records, selectedId, onSelect);
  const { index, position } = deck;
  const record = records[index];
  const hold = useHold();
  const { openMenu } = useRecordActions();
  const [stageRef, stage] = useSize();
  const size = pullOutSize(stage.height);
  const drag = useDeckDrag(deck, { axis: 'x', forward: -1, perItem: 38 });
  const rail = useScrub(deck, (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    return Math.floor(((e.clientX - box.left) / box.width) * records.length);
  });

  const widths = useMemo(() => records.map(spineWidth), [records]);
  const groups = useMemo(() => groupLabels(records, sort), [records, sort]);
  const starts = useMemo(() => groups.map((group, i) => i === 0 || group !== groups[i - 1]), [groups]);
  // The whole collection as stripes of spine colour.
  const stripes = useMemo(() => {
    const stops = records.map(
      (r, i) => `${colorOf(r.spineColor, `${r.artist}${r.title}`)} ${(i / records.length) * 100}% ${((i + 1) / records.length) * 100}%`,
    );
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, [records]);

  const { items, centre } = shelfLayout(widths, starts, position, size);
  const shift = stage.width / 2 - centre;
  const along = `${((Math.max(0, Math.min(records.length - 1, position)) + 0.5) / records.length) * 100}%`;
  const mark = sortMark(record, sort);

  return (
    <div className="deck pull">
      <DeckHeader {...props} deck={deck} />

      <div
        className="pull-stage"
        ref={stageRef}
        role="group"
        aria-label="Records. Swipe or use the arrow keys."
        tabIndex={0}
        onKeyDown={deck.onKeyDown}
        {...drag}
      >
        <div className="pull-glow" aria-hidden="true" />
        <div className="pull-ledge" aria-hidden="true" />
        {records.map((r, i) => {
          const { x, open } = items[i];
          const left = x + shift;
          const ready = Math.abs(i - index) <= READY;
          // Only what is on screen, or about to swing out, is drawn.
          if (!ready && (left > stage.width + 80 || left < -80)) return null;
          const focused = i === index;
          const color = colorOf(r.spineColor, `${r.artist}${r.title}`);
          const width = widths[i];
          // A sleeve turns in from edge-on, as if swung round from its spine.
          const turn = (1 - open) * 0.96;
          const squeeze = Math.min(1, Math.max(width / size, open) / Math.cos(turn));
          const label = `${r.title} by ${r.artist}`;
          return (
            <div key={r.id} className="pull-item" style={{ height: size, transform: `translateX(${left}px)`, zIndex: open > 0 ? 2 : 1 }}>
              {starts[i] && (
                <span className="pull-divider" style={{ left: 6 - DIVIDER }} aria-hidden="true">
                  <b>{groups[i]}</b>
                </span>
              )}
              {open < 0.999 && (
                <button
                  type="button"
                  className="pull-spine"
                  tabIndex={-1}
                  aria-label={`Show ${label}`}
                  style={{
                    width,
                    background: color,
                    color: readableOn(color),
                    opacity: Math.max(0, 1 - open * 2.2),
                    transform: `scaleX(${1 - open * 0.5})`,
                  }}
                  {...hold(() => openMenu(r))}
                  onClick={() => deck.go(i)}
                >
                  <span><b>{r.artist}</b> · {r.title}</span>
                  <i style={{ background: r.popColor || 'currentColor' }} />
                </button>
              )}
              {ready && (
                <div className="pull-out" style={{ width: size, height: size, left: MARGIN * open, visibility: open > 0.01 ? 'visible' : 'hidden' }}>
                  <Vinyl
                    record={r}
                    spinning={i === position}
                    style={{ transform: `translateX(${size * OVERHANG * Math.max(0, open * 3 - 2)}px)`, opacity: open > 0.6 ? 1 : 0 }}
                  />
                  <button
                    type="button"
                    className="pull-sleeve"
                    tabIndex={focused ? 0 : -1}
                    aria-label={`${focused ? 'Open' : 'Show'} ${label}`}
                    style={{
                      opacity: Math.min(1, open * 2.2),
                      transform: open > 0.999 ? 'none' : `perspective(900px) rotateY(${turn}rad) scaleX(${squeeze})`,
                    }}
                    {...hold(() => openMenu(r))}
                    onClick={() => (focused ? deck.open() : deck.go(i))}
                  >
                    <Cover record={r} alt="" />
                    <span className="pull-shade" style={{ opacity: (1 - open) * 0.75 }} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pull-info">
        <StepButton deck={deck} step={-1} />
        <div className="deck-names" aria-live="polite">
          <p className="deck-title">{record.title}</p>
          <p className="muted small">
            {[record.artist, record.year].filter(Boolean).join(' · ')}
            {(record.edition.name || record.edition.color) && (
              <> · <span className="accent">{record.edition.name || record.edition.color}</span></>
            )}
            {record.purchase.price !== null && ` · ${formatMoney(record.purchase.price, record.purchase.currency)}`}
          </p>
        </div>
        <button type="button" className="button primary" onClick={deck.open}>Open</button>
        <StepButton deck={deck} step={1} />
      </div>

      <div className="pull-strip">
        <span className="muted small">{sortMark(records[0], sort)}</span>
        <div
          className="pull-rail"
          role="slider"
          tabIndex={0}
          aria-label="Position in collection"
          aria-valuemin={1}
          aria-valuemax={records.length}
          aria-valuenow={index + 1}
          aria-valuetext={`${record.title}, ${index + 1} of ${records.length}`}
          onKeyDown={deck.onKeyDown}
          {...rail.handlers}
        >
          <span className="pull-stripes" style={{ background: stripes }} />
          <span className="pull-thumb" style={{ left: along }} />
          {rail.scrubbing && (
            <span className="deck-bubble" style={{ left: `clamp(2.5rem, ${along}, 100% - 2.5rem)` }}>{mark}</span>
          )}
        </div>
        <span className="muted small end">{sortMark(records[records.length - 1], sort)}</span>
      </div>
    </div>
  );
}
