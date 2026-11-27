import { useRef, type DragEvent, type MouseEvent, type PointerEvent } from 'react';
import { lockAxis } from './math';

interface Options {
  /** Called as the finger moves; `dx` is measured from where it went down. */
  onMove: (dx: number, event: PointerEvent<HTMLElement>) => void;
  /** Called when the finger lifts. A drag the phone takes over ends with 0, 0. */
  onEnd?: (dx: number, velocity: number) => void;
}

/**
 * Handlers for a sideways drag. Up and down movement is left to scrolling, which
 * needs `touch-action: pan-y` on the element and everything inside it.
 */
export function useSideDrag({ onMove, onEnd }: Options) {
  const drag = useRef<{ x: number; y: number; lastX: number; at: number; velocity: number; sideways: boolean } | null>(null);
  const dragged = useRef(false);

  const finish = (dx: number, velocity: number) => {
    const sideways = drag.current?.sideways;
    drag.current = null;
    if (sideways) onEnd?.(dx, velocity);
  };

  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      dragged.current = false;
      if (!e.isPrimary || e.button !== 0) return;
      drag.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, at: e.timeStamp, velocity: 0, sideways: false };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current) return;
      if (e.pointerType === 'mouse' && !e.buttons) return finish(0, 0);
      const dx = e.clientX - current.x;
      if (!current.sideways) {
        const axis = lockAxis(dx, e.clientY - current.y);
        if (!axis) return;
        if (axis === 'y') {
          drag.current = null;
          return;
        }
        current.sideways = dragged.current = true;
        // Captured only once it is a drag, so that a plain tap still reaches what is inside.
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      const elapsed = e.timeStamp - current.at;
      if (elapsed > 0) current.velocity = (e.clientX - current.lastX) / elapsed;
      current.lastX = e.clientX;
      current.at = e.timeStamp;
      onMove(dx, e);
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current) return;
      // A finger that rested before lifting did not flick.
      finish(e.clientX - current.x, e.timeStamp - current.at > 80 ? 0 : current.velocity);
    },
    onPointerCancel: () => finish(0, 0),
    onClickCapture(e: MouseEvent) {
      // The click that ends a drag must not open or select anything.
      if (dragged.current && e.detail !== 0) {
        e.preventDefault();
        e.stopPropagation();
      }
      dragged.current = false;
    },
    onDragStart: (e: DragEvent) => e.preventDefault(),
  };
}
