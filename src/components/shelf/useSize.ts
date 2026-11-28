import { useCallback, useState } from 'react';

/** The size of an element's content, kept up to date. */
export function useSize(initial = { width: 800, height: 230 }) {
  const [size, setSize] = useState(initial);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
