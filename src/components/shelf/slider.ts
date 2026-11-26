/** How many covers are drawn on each side of the focused one. The last is invisible. */
export const REACH = 4;

// Horizontal centres, in cover widths from the middle. The right side sits further
// out because the focused record slides out of its sleeve that way.
const LEFT = [-0.155, -1.04, -1.47, -1.81, -2.1];
const RIGHT = [-0.155, 1.11, 1.55, 1.89, 2.2];
const SCALE = [1, 0.62, 0.5, 0.4, 0.34];
const OPACITY = [1, 0.9, 0.7, 0.45, 0];

export interface Placement {
  x: number;
  scale: number;
  /** Degrees around the vertical axis, so side covers face the middle. */
  turn: number;
  opacity: number;
  layer: number;
}

/** Where to draw the cover that is `offset` places after the focused one. */
export function placement(offset: number): Placement {
  const distance = Math.min(REACH, Math.abs(offset));
  return {
    x: offset < 0 ? LEFT[distance] : RIGHT[distance],
    scale: SCALE[distance],
    turn: offset === 0 ? 0 : offset < 0 ? 32 : -32,
    opacity: OPACITY[distance],
    layer: 10 - distance,
  };
}

/** Records to move by after dragging `dx` pixels. Dragging left moves forward. */
export function dragSteps(dx: number, coverSize: number): number {
  return -Math.round(dx / (coverSize * 0.45)) || 0;
}

export const clampIndex = (index: number, count: number) => Math.max(0, Math.min(count - 1, index));

/** Cover width that fits the space between the sort bar and the title. */
export function coverSizeFor(width: number, height: number): number {
  return Math.round(Math.max(96, Math.min(300, height - 16, width * 0.3)));
}
