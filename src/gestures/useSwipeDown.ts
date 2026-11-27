import { useCallback, useEffect, useRef } from 'react';
import { dismissesSheet, SLOP } from './math';

/**
 * Pulling a sheet down from the top puts it away, as on iPhone. Give the returned
 * ref to the element that scrolls. Touch only: the phone's own scrolling has to
 * be held off, which pointer events cannot do.
 */
export function useSwipeDown(onDismiss: () => void) {
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });

  return useCallback((sheet: HTMLElement | null) => {
    if (!sheet) return;
    let drag: { x: number; y: number; lastY: number; at: number; velocity: number; moving: boolean } | null = null;

    const settle = () => {
      drag = null;
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
    };
    const start = (e: TouchEvent) => {
      settle();
      // Long text boxes scroll themselves.
      if (e.touches.length !== 1 || sheet.scrollTop > 0 || (e.target as Element).closest('textarea, dialog')) return;
      const { clientX: x, clientY: y } = e.touches[0];
      drag = { x, y, lastY: y, at: e.timeStamp, velocity: 0, moving: false };
    };
    const move = (e: TouchEvent) => {
      if (!drag) return;
      const { clientX, clientY } = e.touches[0];
      const dy = clientY - drag.y;
      if (!drag.moving && (dy <= 0 || Math.abs(clientX - drag.x) > dy)) {
        // Going up or sideways: an ordinary scroll or tap.
        if (Math.hypot(clientX - drag.x, dy) > SLOP) drag = null;
        return;
      }
      e.preventDefault();
      if (!drag.moving && dy < SLOP) return;
      drag.moving = true;
      const elapsed = e.timeStamp - drag.at;
      if (elapsed > 0) drag.velocity = (clientY - drag.lastY) / elapsed;
      drag.lastY = clientY;
      drag.at = e.timeStamp;
      sheet.classList.add('is-dragging');
      sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    };
    const end = (e: TouchEvent) => {
      if (!drag) return;
      const velocity = e.timeStamp - drag.at > 80 ? 0 : drag.velocity;
      const dismiss = drag.moving && dismissesSheet(drag.lastY - drag.y, velocity);
      settle();
      if (dismiss) latest.current();
    };

    sheet.addEventListener('touchstart', start, { passive: true });
    sheet.addEventListener('touchmove', move, { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', settle);
    return () => {
      sheet.removeEventListener('touchstart', start);
      sheet.removeEventListener('touchmove', move);
      sheet.removeEventListener('touchend', end);
      sheet.removeEventListener('touchcancel', settle);
    };
  }, []);
}
