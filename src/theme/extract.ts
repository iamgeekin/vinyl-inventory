import { toHex, toOklab } from './color';
import type { CoverColors } from './palette';

/** Colours are read from this many pixels across and down a cover. */
export const SAMPLE_SIZE = 100;

/** Oklab distance under which two shades count as one colour. */
const SAME = 0.09;
/** Shades this close to a colour's commonest one decide exactly what it looks like. */
const CORE = 0.04;
/** Oklab distance the second colour must keep from the main one. */
const DISTINCT = 0.15;

interface Sum {
  count: number;
  r: number;
  g: number;
  b: number;
}

const mean = (s: Sum) => [s.r / s.count, s.g / s.count, s.b / s.count];

const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function add(into: Sum, from: Sum) {
  into.count += from.count;
  into.r += from.r;
  into.g += from.g;
  into.b += from.b;
}

/**
 * Gathers the pixels into the colours a person would name. The commonest shades
 * start the groups, and each group looks like the pixels around that shade, so
 * two nearby areas are not blended into a colour the cover does not have.
 */
function coloursIn(pixels: Uint8ClampedArray) {
  const shades = new Map<number, Sum>();
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const shade = shades.get(key);
    if (shade) add(shade, { count: 1, r, g, b });
    else shades.set(key, { count: 1, r, g, b });
    total += 1;
  }
  const groups: { all: Sum; core: Sum; seed: number[] }[] = [];
  for (const shade of [...shades.values()].sort((a, b) => b.count - a.count)) {
    const lab = toOklab(mean(shade));
    let nearest: (typeof groups)[number] | undefined;
    let gap = SAME;
    for (const group of groups) {
      const d = distance(lab, group.seed);
      if (d < gap) [nearest, gap] = [group, d];
    }
    if (!nearest) {
      groups.push({ all: { ...shade }, core: { ...shade }, seed: lab });
      continue;
    }
    add(nearest.all, shade);
    if (gap < CORE) add(nearest.core, shade);
  }
  return groups.map(({ all, core }) => {
    const lab = toOklab(mean(core));
    return { hex: toHex(mean(core)), lab, share: all.count / total, chroma: Math.hypot(lab[1], lab[2]) };
  });
}

type Colour = ReturnType<typeof coloursIn>[number];

const highest = (colours: Colour[], score: (c: Colour) => number): Colour | undefined =>
  colours.reduce<Colour | undefined>((best, c) => (!best || score(c) > score(best) ? c : best), undefined);

/**
 * Reads two colours straight off a cover. The main one covers the most area,
 * where a colour beats black, white or grey if they are close. The second is the
 * most prominent colour that is clearly different from it. `pixels` is RGBA data.
 */
export function extractColors(pixels: Uint8ClampedArray): CoverColors {
  const colours = coloursIn(pixels);
  const main = highest(colours, (c) => c.share * (0.65 + 0.35 * Math.min(1, c.chroma / 0.12)));
  if (!main) return { main: '#33333d', pop: '#33333d' };

  const others = colours.filter((c) => distance(c.lab, main.lab) >= DISTINCT);
  // Area counts for less than vividness, so lettering or a bright shape can win.
  const score = (c: Colour) => c.share ** 0.6 * (0.25 + Math.min(c.chroma, 0.2) / 0.2);
  // Specks are only considered when the cover has nothing larger to offer.
  const pop =
    highest(others.filter((c) => c.share >= 0.02), score) ??
    highest(others.filter((c) => c.share >= 0.004), score) ??
    main;
  return { main: main.hex, pop: pop.hex };
}
