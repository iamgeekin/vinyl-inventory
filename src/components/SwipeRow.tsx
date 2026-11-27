import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { VinylRecord } from '../data/types';
import { rowOffset, rowStaysOpen } from '../gestures/math';
import { useSideDrag } from '../gestures/useSideDrag';
import { useRecordActions } from './RecordMenu';

/** Width of the two buttons behind a row. Matches the stylesheet. */
const ACTIONS = 160;

/** A list row that slides left to show Edit and Delete, as in iPhone lists. */
export function SwipeRow({ record, children }: { record: VinylRecord; children: ReactNode }) {
  const { askDelete } = useRecordActions();
  const [open, setOpen] = useState(false);
  // Where the finger has the row, while it is being dragged.
  const [dragged, setDragged] = useState<number | null>(null);
  const row = useRef<HTMLDivElement>(null);
  const offset = dragged ?? (open ? -ACTIONS : 0);

  const from = open ? -ACTIONS : 0;
  const drag = useSideDrag({
    onMove: (dx) => setDragged(rowOffset(from + dx, ACTIONS)),
    onEnd: (dx, velocity) => {
      // A drag the phone took over leaves the row as it was.
      if (dx || velocity) setOpen(rowStaysOpen(from + dx, velocity, ACTIONS));
      setDragged(null);
    },
  });

  // Touching anywhere else closes the row.
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => !row.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return (
    <div
      ref={row}
      className={`swipe-row${dragged === null ? '' : ' is-dragging'}`}
      {...drag}
      onClickCapture={(e: MouseEvent) => {
        drag.onClickCapture(e);
        // A tap on an open row closes it rather than opening the record.
        if (open && !e.isPropagationStopped() && !(e.target as Element).closest('.swipe-actions')) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div className="swipe-actions" style={{ visibility: offset ? 'visible' : 'hidden' }}>
        <Link className="swipe-edit" to={`/record/${record.id}/edit`} draggable={false}>Edit</Link>
        <button type="button" className="swipe-delete" onClick={() => { setOpen(false); askDelete(record); }}>Delete</button>
      </div>
      <div className="swipe-content" style={{ transform: offset ? `translateX(${offset}px)` : undefined }}>
        {children}
      </div>
    </div>
  );
}
