import { useEffect, useState } from 'react';
import { useCover } from '../components/Cover';
import type { VinylRecord } from '../data/types';
import { sampleColors } from '../scan/thumbnail';
import type { CoverColors } from './palette';

const cache = new Map<string, Promise<CoverColors | null>>();

/** Resolves to null when the picture's host does not let the browser read it. */
async function readColors(src: string): Promise<CoverColors | null> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = src;
  try {
    await image.decode();
    return sampleColors(image);
  } catch {
    return null;
  }
}

/**
 * The colours of a record's cover. `undefined` while they are being worked out,
 * `null` when the record has no colours to offer.
 *
 * They are read from the picture itself, so records saved by an older version
 * follow the current rules without being rewritten. The colours saved with a
 * record are used when there is no picture the browser can read.
 */
export function useRecordColors(record: VinylRecord | undefined): CoverColors | null | undefined {
  const saved = record?.spineColor ? { main: record.spineColor, pop: record.popColor || record.spineColor } : null;
  const { src, loading } = useCover(record);
  const [read, setRead] = useState<{ src: string; colors: CoverColors | null }>();

  useEffect(() => {
    if (!src) return;
    let live = true;
    let request = cache.get(src);
    if (!request) {
      request = readColors(src).then((colors) => {
        // A picture that could not be read, perhaps offline, is tried again later.
        if (!colors) cache.delete(src);
        return colors;
      });
      cache.set(src, request);
    }
    request.then((colors) => live && setRead({ src, colors }));
    return () => {
      live = false;
    };
  }, [src]);

  if (!record) return undefined;
  if (!src) return loading ? undefined : saved;
  if (read?.src !== src) return undefined;
  return read.colors ?? saved;
}
