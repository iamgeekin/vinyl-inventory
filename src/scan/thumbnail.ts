import { extractColors, SAMPLE_SIZE } from '../theme/extract';
import type { CoverColors } from '../theme/palette';

const SIZE = 400;
const MAX_BYTES = 100 * 1024;

export interface Thumbnail {
  dataUrl: string;
  /** The cover's main colour, also used for its spine. */
  spineColor: string;
  popColor: string;
}

/** Draws the centre square of an image onto a canvas of the given size. */
export function squareCanvas(image: ImageBitmap | HTMLImageElement, size: number, smooth = true): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot process images.');
  const side = Math.min(image.width, image.height);
  context.imageSmoothingEnabled = smooth;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, size, size);
  return canvas;
}

/** The two colours of a cover. Throws if the browser may not read the picture. */
export function sampleColors(image: ImageBitmap | HTMLImageElement): CoverColors {
  // Picks pixels rather than blending them, so no colour appears that the cover does not have.
  const context = squareCanvas(image, SAMPLE_SIZE, false).getContext('2d')!;
  return extractColors(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
}

export async function makeThumbnail(source: Blob): Promise<Thumbnail> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That file could not be read as an image.');
  }
  const canvas = squareCanvas(bitmap, Math.min(SIZE, Math.max(1, Math.min(bitmap.width, bitmap.height))));
  const { main, pop } = sampleColors(bitmap);
  bitmap.close();
  let quality = 0.86;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return { dataUrl, spineColor: main, popColor: pop };
}

/** Only works for hosts that allow cross-origin reads, such as iTunes and Cover Art Archive. */
export async function fetchImage(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal, mode: 'cors' });
  if (!response.ok) throw new Error(`Image not available (${response.status}).`);
  return response.blob();
}
