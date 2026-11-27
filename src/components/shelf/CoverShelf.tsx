import { Link } from 'react-router-dom';
import type { VinylRecord } from '../../data/types';
import { useHold } from '../../gestures/useHold';
import { Cover } from '../Cover';
import { useRecordActions } from '../RecordMenu';
import { useWidth } from './useWidth';

export function CoverShelf({ records, onOpen }: { records: VinylRecord[]; onOpen: (id: string) => void }) {
  const [ref, width] = useWidth();
  const hold = useHold();
  const { openMenu } = useRecordActions();
  const columns = Math.max(3, Math.floor(width / 140));
  const rows: VinylRecord[][] = [];
  for (let i = 0; i < records.length; i += columns) rows.push(records.slice(i, i + columns));

  return (
    <div className="shelves cover-view" ref={ref}>
      {rows.map((row) => (
        <div className="cover-row" key={row[0].id}>
          <ul className="covers" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {row.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/record/${r.id}`}
                  aria-label={`${r.title} by ${r.artist}`}
                  draggable={false}
                  {...hold(() => openMenu(r))}
                  onClick={() => onOpen(r.id)}
                >
                  <Cover record={r} alt="" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="ledge" />
        </div>
      ))}
    </div>
  );
}
