import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { SLOP } from './math';

const HOLD_MS = 500;

/**
 * Long press, for any number of elements: spread `hold(action)` on each. A right
 * click or the keyboard's menu key does the same.
 */
export function useHold() {
  const press = useRef({ timer: 0, x: 0, y: 0, held: false });
  const stop = () => clearTimeout(press.current.timer);
  useEffect(() => stop, []);

  return (action: () => void) => {
    const fire = () => {
      stop();
      if (press.current.held) return;
      press.current.held = true;
      action();
    };
    return {
      onPointerDown(e: PointerEvent) {
        stop();
        press.current = { timer: 0, x: e.clientX, y: e.clientY, held: false };
        if (e.isPrimary && e.button === 0) press.current.timer = window.setTimeout(fire, HOLD_MS);
      },
      onPointerMove(e: PointerEvent) {
        // The same distance at which a drag takes over, so the two never both happen.
        if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) >= SLOP) stop();
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onPointerLeave: stop,
      onContextMenu(e: MouseEvent) {
        e.preventDefault();
        fire();
      },
      onClickCapture(e: MouseEvent) {
        // Lifting the finger after a long press is not also a tap.
        if (!press.current.held || e.detail === 0) return;
        e.preventDefault();
        e.stopPropagation();
        press.current.held = false;
      },
    };
  };
}
