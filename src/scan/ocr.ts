import { pickWords, type OcrWord } from './textClean';

const MAX_SIDE = 1400;

/** Greyscale with stretched contrast, optionally inverted for light text on dark art. */
async function prepare(photo: Blob, invert: boolean): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(photo, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const grey = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = grey;
    min = Math.min(min, grey);
    max = Math.max(max, grey);
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < data.length; i += 4) {
    let value = ((data[i] - min) * 255) / range;
    if (invert) value = 255 - value;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Reads words from a cover photo on the device. The reader and its English data
 * (a few MB) are downloaded the first time, then cached.
 */
export async function readCoverWords(photo: Blob, onProgress: (message: string) => void): Promise<string[]> {
  onProgress('Loading the text reader…');
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(`Reading the cover… ${Math.round(m.progress * 100)}%`);
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const found: OcrWord[] = [];
    for (const invert of [false, true]) {
      const canvas = await prepare(photo, invert);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            for (const word of line.words) {
              found.push({ text: word.text, confidence: word.confidence, height: word.bbox.y1 - word.bbox.y0 });
            }
          }
        }
      }
      if (pickWords(found).length >= 3) break;
    }
    return pickWords(found);
  } finally {
    await worker.terminate();
  }
}
