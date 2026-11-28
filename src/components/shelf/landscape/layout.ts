/**
 * Where things sit on the two sideways layouts. A position runs along the
 * collection in records, and is a fraction while moving between two of them.
 */

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export const clampIndex = (index: number, count: number) => clamp(index, 0, count - 1);

/** A drag may pull a little past either end, so that the end can be felt. */
export const clampPosition = (position: number, count: number) => clamp(position, -0.35, count - 0.65);

/* ---------- Dragging ---------- */

/** A finger that rested this long before lifting did not flick. */
const REST_MS = 80;
const GLIDE_MS = 150;
const FURTHEST_FLICK = 12;

/**
 * Where a released drag comes to rest. `speed` is in records per millisecond and
 * `rested` is how long ago the finger last moved.
 */
export function releaseTarget(position: number, speed: number, rested: number, count: number): number {
  const glide = rested > REST_MS ? 0 : clamp(speed * GLIDE_MS, -FURTHEST_FLICK, FURTHEST_FLICK);
  return clampIndex(Math.round(position + glide), count);
}

/* ---------- Pull-out shelf ---------- */

/** Room taken by a divider card between two spines. */
export const DIVIDER = 22;
/** How far the disc slides out, in sleeve widths. */
export const OVERHANG = 0.4;
/** Space either side of the pulled-out record. */
export const MARGIN = 20;

/** Sleeve width, and spine height, for the height of the shelf. */
export const pullOutSize = (height: number) => Math.round(clamp(height - 46, 96, 250));

/** How far a record is pulled out: 1 in focus, 0 a whole record away. */
export function openness(index: number, position: number): number {
  const near = Math.max(0, 1 - Math.abs(index - position));
  return near * near * (3 - 2 * near);
}

/**
 * Places every record along the shelf. `starts` marks those with a divider card
 * in front. `centre` is the point that belongs in the middle of the screen.
 */
export function shelfLayout(widths: number[], starts: boolean[], position: number, size: number) {
  const openWidth = size * (1 + OVERHANG) + MARGIN * 2;
  // Past either end the shelf slides on, with the end record still pulled out.
  const within = clamp(position, 0, widths.length - 1);
  let end = 0;
  const items = widths.map((width, i) => {
    const open = openness(i, within);
    const x = end + (starts[i] ? DIVIDER : 0);
    end = x + width + (openWidth - width) * open;
    // The middle of the sleeve and disc together once pulled out.
    return { x, open, centre: x + width / 2 + ((openWidth - width) / 2) * open };
  });
  const low = Math.floor(within);
  const high = clampIndex(low + 1, widths.length);
  const centre = items[low].centre + (items[high].centre - items[low].centre) * (within - low) + (position - within) * 60;
  return { items, centre };
}

/* ---------- Crate ---------- */

/** How many sleeves stand behind the one in front. The last is invisible. */
export const BEHIND = 7;
/** Height of the crate's front below the sleeves. */
export const CRATE_FLOOR = 40;

/** Sleeve size and spacing that fit a crate of this width and height. */
export function crateFit(width: number, height: number) {
  const step = height < 270 ? 10 : 13;
  // Room is left on the right for the disc to slide into.
  const wide = 1 + OVERHANG + 0.02;
  const size = Math.round(clamp(Math.min(height - CRATE_FLOOR - BEHIND * step - 6, (width - 44) / wide), 96, 230));
  return { size, step, left: Math.max(22, Math.round((width - size * wide) / 2)) };
}

/** How the sleeve `distance` records behind the front one is drawn. Negative has been flipped past. */
export function cratePose(distance: number, step: number) {
  if (distance >= 0) {
    // Waiting their turn, each a little higher and further back.
    return {
      y: -distance * step,
      z: -distance * 26,
      tilt: 0,
      dim: Math.min(0.62, distance * 0.11),
      opacity: clamp(BEHIND - distance, 0, 1),
    };
  }
  // Tips forward into the front of the crate.
  const tipped = Math.min(1, -distance);
  const further = Math.max(0, -distance - 1);
  return {
    y: tipped * 25 + further * 4,
    z: tipped * 10,
    tilt: -(tipped * 82 + Math.min(6, further * 2)),
    dim: tipped * 0.25 + further * 0.12,
    opacity: clamp(1 - (further - 1) / 3, 0, 1),
  };
}

/**
 * What the side index lists when there is room for `room` lines: every group, or
 * evenly spread names with dots standing for the groups between them.
 */
export function indexEntries(count: number, room: number): { group: number; named: boolean }[] {
  if (count <= room) return Array.from({ length: count }, (_, group) => ({ group, named: true }));
  const names = Math.max(2, Math.ceil(room / 2));
  const entries: { group: number; named: boolean }[] = [];
  let previous = 0;
  for (let i = 0; i < names; i++) {
    const group = Math.round((i * (count - 1)) / (names - 1));
    if (group - previous > 1) entries.push({ group: Math.round((previous + group) / 2), named: false });
    entries.push({ group, named: true });
    previous = group;
  }
  return entries;
}

/** The index line to light up for a group: its own name, or else the dot that stands for it. */
export function litEntry(entries: { group: number; named: boolean }[], group: number): number {
  const own = entries.findIndex((e) => e.named && e.group === group);
  if (own >= 0) return own;
  // A dot stands for every group between the names either side of it.
  return entries.findIndex((e, n) => !e.named && entries[n - 1].group < group && group < entries[n + 1].group);
}
