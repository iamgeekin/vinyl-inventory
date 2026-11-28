import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { VinylRecord } from '../../data/types';
import { swipeStep } from '../../gestures/math';
import { useHold } from '../../gestures/useHold';
import { useSideDrag } from '../../gestures/useSideDrag';
import { fallbackColor, hash, readableOn } from '../colors';
import { Cover } from '../Cover';
import { useRecordActions } from '../RecordMenu';
import { useWidth } from './useWidth';

const GAP = 3;
export const spineWidth = (r: VinylRecord) => 24 + (hash(r.id) % 5) + Math.min(8, (r.format.discs - 1) * 4);
const spineHeight = (r: VinylRecord) => 160 + (hash(r.title) % 13);

/** Fills each shelf from left to right with as many spines as fit. */
export function packShelves<T>(items: T[], widthOf: (item: T) => number, available: number, gap = GAP): T[][] {
  const shelves: T[][] = [];
  let used = 0;
  for (const item of items) {
    const width = widthOf(item);
    if (!shelves.length || used + gap + width > available) {
      shelves.push([item]);
      used = width;
    } else {
      shelves[shelves.length - 1].push(item);
      used += gap + width;
    }
  }
  return shelves;
}

interface Props {
  records: VinylRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SpineShelf({ records, selectedId, onSelect }: Props) {
  const navigate = useNavigate();
  const [ref, width] = useWidth();
  const hold = useHold();
  const { openMenu } = useRecordActions();
  const selected = records.find((r) => r.id === selectedId) ?? records[0];
  const index = records.indexOf(selected);

  // Swiping the large cover steps to the neighbouring record.
  const [pull, setPull] = useState(0);
  const [arrived, setArrived] = useState<'next' | 'previous'>();
  const swipe = useSideDrag({
    // With no record on that side the cover barely moves.
    onMove: (dx) => setPull(records[index - Math.sign(dx)] ? dx * 0.6 : dx * 0.15),
    onEnd: (dx, velocity) => {
      setPull(0);
      const step = swipeStep(dx, velocity);
      const to = records[index + step];
      if (!step || !to) return;
      setArrived(step > 0 ? 'next' : 'previous');
      onSelect(to.id);
    },
  });

  // Running a finger along a shelf pulls out each record it passes.
  const scrub = useSideDrag({
    onMove: (_, e) => {
      const spines = [...e.currentTarget.querySelectorAll<HTMLElement>('.spine')];
      const under = spines.find((spine) => e.clientX < spine.getBoundingClientRect().right + GAP) ?? spines[spines.length - 1];
      const id = under?.dataset.id;
      if (!id || id === selected.id) return;
      setArrived(undefined);
      onSelect(id);
    },
  });

  return (
    <div className="spine-view">
      {selected && (
        <div className={`pulled-swipe${pull ? ' is-dragging' : ''}`} {...swipe}>
          <Link
            className="pulled"
            to={`/record/${selected.id}`}
            draggable={false}
            style={{ transform: pull ? `translateX(${pull}px)` : undefined }}
            {...hold(() => openMenu(selected))}
          >
            <span key={selected.id} className="pulled-art" data-arrived={arrived}>
              <Cover record={selected} />
            </span>
            <span className="pulled-title">{selected.title}</span>
            <span className="muted small">
              {[selected.artist, selected.year, selected.edition.name].filter(Boolean).join(' · ')}
            </span>
          </Link>
        </div>
      )}
      <div className="shelves" ref={ref}>
        {packShelves(records, spineWidth, width - 24).map((shelf) => (
          <div className="spine-row" key={shelf[0].id}>
            <div className="spines" {...scrub}>
              {shelf.map((r) => {
                const color = r.spineColor || fallbackColor(`${r.artist}${r.title}`);
                const isSelected = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    data-id={r.id}
                    type="button"
                    className={`spine${isSelected ? ' is-pulled' : ''}`}
                    style={{ width: spineWidth(r), height: spineHeight(r), background: color, color: readableOn(color) }}
                    aria-label={`${r.title} by ${r.artist}`}
                    aria-pressed={isSelected}
                    {...hold(() => openMenu(r))}
                    onClick={() => {
                      setArrived(undefined);
                      if (isSelected) navigate(`/record/${r.id}`);
                      else onSelect(r.id);
                    }}
                  >
                    <span>{r.artist} · {r.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="ledge" />
          </div>
        ))}
      </div>
    </div>
  );
}
