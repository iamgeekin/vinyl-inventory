import { useCallback, useState } from 'react';

/** Tracks the width of an element. Attach the returned ref to it. */
export function useWidth(initial = 360) {
  const [width, setWidth] = useState(initial);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
