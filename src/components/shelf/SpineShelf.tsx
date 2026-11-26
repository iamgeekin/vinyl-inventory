import { Link, useNavigate } from 'react-router-dom';
import type { VinylRecord } from '../../data/types';
import { fallbackColor, hash, readableOn } from '../colors';
import { Cover } from '../Cover';
import { useWidth } from './useWidth';

const GAP = 3;
const spineWidth = (r: VinylRecord) => 24 + (hash(r.id) % 5) + Math.min(8, (r.format.discs - 1) * 4);
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
  const selected = records.find((r) => r.id === selectedId) ?? records[0];

  return (
    <div className="spine-view">
      {selected && (
        <Link className="pulled" to={`/record/${selected.id}`}>
          <span className="pulled-art">
            <Cover key={selected.id} record={selected} />
          </span>
          <span className="pulled-title">{selected.title}</span>
          <span className="muted small">
            {[selected.artist, selected.year, selected.edition.name].filter(Boolean).join(' · ')}
          </span>
        </Link>
      )}
      <div className="shelves" ref={ref}>
        {packShelves(records, spineWidth, width - 24).map((shelf) => (
          <div className="spine-row" key={shelf[0].id}>
            <div className="spines">
              {shelf.map((r) => {
                const color = r.spineColor || fallbackColor(`${r.artist}${r.title}`);
                const isSelected = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`spine${isSelected ? ' is-pulled' : ''}`}
                    style={{ width: spineWidth(r), height: spineHeight(r), background: color, color: readableOn(color) }}
                    aria-label={`${r.title} by ${r.artist}`}
                    aria-pressed={isSelected}
                    onClick={() => (isSelected ? navigate(`/record/${r.id}`) : onSelect(r.id))}
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
