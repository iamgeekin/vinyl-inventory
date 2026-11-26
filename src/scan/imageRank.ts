import { fetchImage, squareCanvas } from './thumbnail';

export interface Signature {
  /** Normalised 4x4x4 colour histogram. */
  colours: number[];
  /** Difference hash: whether each cell is brighter than its right neighbour. */
  edges: boolean[];
}

const SIZE = 72;

/** `pixels` is RGBA data for a `width` by `height` image. */
export function signature(pixels: Uint8ClampedArray, width: number, height: number): Signature {
  const colours = new Array<number>(64).fill(0);
  const sums = new Array<number>(9 * 8).fill(0);
  const counts = new Array<number>(9 * 8).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      colours[((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6)] += 1 / (width * height);
      const cell = Math.floor((y * 8) / height) * 9 + Math.floor((x * 9) / width);
      sums[cell] += 0.299 * r + 0.587 * g + 0.114 * b;
      counts[cell] += 1;
    }
  }
  const grey = sums.map((s, i) => s / (counts[i] || 1));
  const edges: boolean[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) edges.push(grey[row * 9 + col] > grey[row * 9 + col + 1] + 1);
  }
  return { colours, edges };
}

/** 0 for unrelated images, 1 for identical ones. */
export function similarity(a: Signature, b: Signature): number {
  const colour = a.colours.reduce((sum, value, i) => sum + Math.min(value, b.colours[i]), 0);
  const same = a.edges.reduce((n, value, i) => n + Number(value === b.edges[i]), 0) / a.edges.length;
  // Two unrelated hashes agree about half the time, so rescale that to zero.
  return 0.5 * Math.min(1, colour) + 0.5 * Math.max(0, same * 2 - 1);
}

export async function signatureOf(image: Blob): Promise<Signature> {
  const bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' });
  const canvas = squareCanvas(bitmap, SIZE);
  bitmap.close();
  return signature(canvas.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data, SIZE, SIZE);
}

/** Orders items by how much their artwork looks like the photo. Unreadable images go last. */
export async function rankByImage<T extends { thumbUrl: string }>(
  photo: Blob,
  items: T[],
  signal?: AbortSignal,
): Promise<{ item: T; score: number }[]> {
  const target = await signatureOf(photo);
  const scored = await Promise.all(
    items.map(async (item) => {
      try {
        const art = await signatureOf(await fetchImage(item.thumbUrl, signal));
        return { item, score: similarity(target, art) };
      } catch {
        return { item, score: -1 };
      }
    }),
  );
  return scored.sort((a, b) => b.score - a.score);
}
