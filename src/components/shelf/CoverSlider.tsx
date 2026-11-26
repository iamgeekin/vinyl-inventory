import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SHORT_SORT_LABELS, sortMark } from '../../data/sort';
import { formatMoney } from '../../data/stats';
import type { SortKey, VinylRecord } from '../../data/types';
import { discColor, grooves } from '../colors';
import { Cover } from '../Cover';
import { NextIcon, PreviousIcon } from '../Icons';
import { ModeButton } from '../ModeButton';
import { clampIndex, coverSizeFor, dragSteps, placement, REACH } from './slider';

function useSize() {
  const [size, setSize] = useState({ width: 800, height: 230 });
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

interface Props {
  /** In the order to show them. Must not be empty. */
  records: VinylRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  filtered: boolean;
  onClearFilters: () => void;
}

/** The sideways view: one record enlarged in the middle, the rest to swipe through. */
export function CoverSlider({ records, selectedId, onSelect, sort, onSort, filtered, onClearFilters }: Props) {
  const navigate = useNavigate();
  const [stageRef, stage] = useSize();
  const size = coverSizeFor(stage.width, stage.height);
  const index = Math.max(0, records.findIndex((r) => r.id === selectedId));
  const record = records[index];
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  const go = (to: number) => {
    const next = records[clampIndex(to, records.length)];
    if (next.id !== record.id) onSelect(next.id);
  };
  const open = () => navigate(`/record/${record.id}`);

  const onPointerDown = (e: PointerEvent) => {
    dragged.current = false;
    drag.current = { x: e.clientX, from: index, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    if (e.pointerType === 'mouse' && !e.buttons) {
      drag.current = null;
      return;
    }
    const dx = e.clientX - current.x;
    if (!current.moved) {
      if (Math.abs(dx) < 8) return;
      current.moved = dragged.current = true;
      // Captured only once it is a swipe, so that a plain tap still reaches the cover.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    go(current.from + dragSteps(dx, size));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const to = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: records.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };

  const first = Math.max(0, index - REACH);

  return (
    <div className="slider">
      <header className="slider-head">
        <h1>
          Collection <span className="muted">{index + 1} of {records.length}</span>
        </h1>
        {filtered && (
          <button type="button" className="chip" onClick={onClearFilters}>Clear filters</button>
        )}
        <div className="slider-sorts segmented" role="group" aria-label="Sort by">
          {Object.entries(SHORT_SORT_LABELS).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={sort === key} onClick={() => onSort(key as SortKey)}>
              {label}
            </button>
          ))}
        </div>
        <ModeButton />
      </header>

      <div
        className="slider-stage"
        ref={stageRef}
        role="group"
        aria-label="Records. Swipe or use the arrow keys."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          // The click that ends a swipe must not open or select anything.
          if (dragged.current) e.stopPropagation();
          dragged.current = false;
        }}
      >
        <div className="slider-glow" aria-hidden="true" />
        {records.slice(first, index + REACH + 1).map((r, i) => {
          const offset = first + i - index;
          const place = placement(offset);
          const focused = offset === 0;
          return (
            <div
              key={r.id}
              className={`slide${focused ? ' is-focused' : ''}`}
              style={{
                width: size,
                height: size,
                left: (stage.width - size) / 2,
                top: (stage.height - size) / 2,
                transform: `translateX(${place.x * size}px) perspective(700px) rotateY(${place.turn}deg) scale(${place.scale})`,
                opacity: place.opacity,
                zIndex: place.layer,
                visibility: place.opacity ? 'visible' : 'hidden',
              }}
            >
              <div
                className="slide-disc"
                style={{ background: grooves(discColor(r.edition.color)), transform: `translateX(${focused ? size * 0.38 : 0}px)` }}
                aria-hidden="true"
              />
              <button
                type="button"
                className="slide-cover"
                tabIndex={focused ? 0 : -1}
                aria-label={`${focused ? 'Open' : 'Show'} ${r.title} by ${r.artist}`}
                onClick={() => (focused ? open() : onSelect(r.id))}
              >
                <Cover record={r} alt="" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="slider-info">
        <button type="button" className="mode-button" aria-label="Previous record" disabled={index === 0} onClick={() => go(index - 1)}>
          <PreviousIcon />
        </button>
        <div className="slider-names" aria-live="polite">
          <p className="slider-title">{record.title}</p>
          <p className="muted small">
            {[record.artist, record.year].filter(Boolean).join(' · ')}
            {(record.edition.name || record.edition.color) && (
              <> · <span className="accent">{record.edition.name || record.edition.color}</span></>
            )}
            {record.purchase.price !== null && ` · ${formatMoney(record.purchase.price, record.purchase.currency)}`}
          </p>
        </div>
        <button type="button" className="button primary" onClick={open}>Open</button>
        <button type="button" className="mode-button" aria-label="Next record" disabled={index === records.length - 1} onClick={() => go(index + 1)}>
          <NextIcon />
        </button>
      </div>

      <div className="slider-scrub">
        <span className="muted small">{sortMark(records[0], sort)}</span>
        <input
          type="range"
          aria-label="Position in collection"
          aria-valuetext={`${record.title}, ${index + 1} of ${records.length}`}
          min={0}
          max={records.length - 1}
          value={index}
          onChange={(e) => go(Number(e.target.value))}
        />
        <span className="muted small end">{sortMark(records[records.length - 1], sort)}</span>
        <span className="slider-mark">{sortMark(record, sort)}</span>
      </div>
    </div>
  );
}
