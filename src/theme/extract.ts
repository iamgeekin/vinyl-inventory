import { toHex } from './color';
import type { CoverColors } from './palette';

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Finds the colour covering the most area and the most vivid colour that is
 * clearly different from it. `pixels` is RGBA data.
 */
export function extractColors(pixels: Uint8ClampedArray): CoverColors {
  const buckets = new Map<number, Bucket>();
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
    total += 1;
  }
  const colours = [...buckets.values()]
    .map((k) => ({ share: k.count / total, rgb: [k.r / k.count, k.g / k.count, k.b / k.count] }))
    .sort((a, b) => b.share - a.share);
  if (!colours.length) return { main: '#33333d', pop: '#33333d' };

  const main = colours[0];
  let pop = main;
  let best = 0;
  for (const c of colours) {
    const distance = Math.hypot(...c.rgb.map((v, i) => v - main.rgb[i]));
    if (distance < 70 || c.share < 0.005) continue;
    const vivid = (Math.max(...c.rgb) - Math.min(...c.rgb)) / 255;
    // Area counts, but less than vividness, so a small bright detail can win.
    const score = (0.15 + vivid) * c.share ** 0.35;
    if (score > best) {
      best = score;
      pop = c;
    }
  }
  return { main: toHex(main.rgb), pop: toHex(pop.rgb) };
}
