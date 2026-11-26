import { useEffect, useState } from 'react';
import { useCoverSrc } from '../components/Cover';
import type { VinylRecord } from '../data/types';
import { extractColors } from './extract';
import type { CoverColors } from './palette';

const cache = new Map<string, Promise<CoverColors | null>>();

/** Resolves to null when the picture's host does not let the browser read it. */
async function readColors(src: string): Promise<CoverColors | null> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = src;
  try {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 40;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, 40, 40);
    return extractColors(context.getImageData(0, 0, 40, 40).data);
  } catch {
    return null;
  }
}

/**
 * The colours of a record's cover. `undefined` while they are being worked out,
 * `null` when the record has no colours to offer.
 */
export function useRecordColors(record: VinylRecord | undefined): CoverColors | null | undefined {
  const saved = record?.spineColor && record.popColor ? { main: record.spineColor, pop: record.popColor } : null;
  const src = useCoverSrc(record);
  const [read, setRead] = useState<{ src: string; colors: CoverColors | null }>();
  const needsReading = Boolean(record && !saved && src);

  useEffect(() => {
    if (!needsReading) return;
    let live = true;
    let request = cache.get(src);
    if (!request) {
      request = readColors(src);
      cache.set(src, request);
    }
    request.then((colors) => live && setRead({ src, colors }));
    return () => {
      live = false;
    };
  }, [needsReading, src]);

  if (!record) return undefined;
  if (saved) return saved;
  const fallback = record.spineColor ? { main: record.spineColor, pop: record.spineColor } : null;
  if (!src) return record.coverVersion ? undefined : fallback;
  if (read?.src !== src) return undefined;
  return read.colors ?? fallback;
}
