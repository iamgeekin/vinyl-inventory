/** The rules behind each gesture, in pixels and pixels per millisecond. */

/** Movement allowed before a touch stops being a tap or a long press. */
export const SLOP = 10;

/** Which way a drag is going, once it has gone far enough to tell. */
export function lockAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.hypot(dx, dy) < SLOP) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
}

/** Where a row sits while it is dragged. `width` is that of the buttons behind it. */
export function rowOffset(wanted: number, width: number): number {
  // Past either end the row follows only a little, so the end can be felt.
  if (wanted > 0) return wanted * 0.2;
  if (wanted < -width) return -width + (wanted + width) * 0.2;
  return wanted;
}

/** Whether a row let go of should stay open. A flick decides; otherwise the nearer side. */
export function rowStaysOpen(offset: number, velocity: number, width: number): boolean {
  if (velocity < -0.4) return true;
  if (velocity > 0.4) return false;
  return offset < -width / 2;
}

/** The record a sideways swipe asks for: 1 the next, -1 the previous, 0 neither. */
export function swipeStep(dx: number, velocity: number): -1 | 0 | 1 {
  const flick = Math.abs(velocity) > 0.5 && Math.abs(dx) > 20 && Math.sign(velocity) === Math.sign(dx);
  if (Math.abs(dx) < 60 && !flick) return 0;
  return dx < 0 ? 1 : -1;
}

/** Whether a downward drag went far or fast enough to put a sheet away. */
export const dismissesSheet = (dy: number, velocity: number): boolean => dy > 120 || (velocity > 0.5 && dy > 40);
