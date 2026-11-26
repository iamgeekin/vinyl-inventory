export interface OcrWord {
  text: string;
  /** 0 to 100. */
  confidence: number;
  /** Height of the word in pixels. Titles are usually the largest text. */
  height: number;
}

const NOISE = new Set(['stereo', 'mono', 'records', 'vinyl', 'lp', 'side', 'rpm']);

/** Keeps the words most likely to be the artist or title, in reading order. */
export function pickWords(words: OcrWord[], limit = 8): string[] {
  const seen = new Set<string>();
  return words
    .map((w, order) => ({ ...w, order, text: w.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') }))
    .filter((w) => {
      const key = w.text.toLowerCase();
      const letters = w.text.match(/\p{L}/gu)?.length ?? 0;
      if (w.confidence < 55 || w.text.length < 2 || letters < 2) return false;
      if (letters / w.text.length < 0.6 || NOISE.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.height * b.confidence - a.height * a.confidence)
    .slice(0, limit)
    .sort((a, b) => a.order - b.order)
    .map((w) => w.text);
}

/**
 * Search terms to try, from most to least specific, because one misread word can
 * make a search return nothing. `words` should be in reading order.
 */
export function queryPlan(words: string[]): string[] {
  if (!words.length) return [];
  const longest = [...words].sort((a, b) => b.length - a.length);
  const keepOrder = (n: number) => {
    const chosen = new Set(longest.slice(0, n));
    return words.filter((w) => chosen.has(w)).join(' ');
  };
  return [...new Set([words.join(' '), keepOrder(4), keepOrder(2), longest[0], longest[1] ?? ''])].filter(Boolean);
}
