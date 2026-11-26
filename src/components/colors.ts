import { contrast } from '../theme/color';

const PALETTE = ['#0e6b5c', '#2b4f81', '#7a2e1d', '#5d3a78', '#8a4b2a', '#44603a', '#a63d40', '#2f3e46', '#c4442c', '#1d5b82'];

export function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export const fallbackColor = (key: string) => PALETTE[hash(key) % PALETTE.length];

/** Black or white, whichever reads better on the given background. */
export const readableOn = (hex: string): string =>
  contrast(hex, '#000000') > contrast(hex, '#ffffff') ? '#0c0c0f' : '#ffffff';

const DISC_COLOURS: [RegExp, string][] = [
  [/clear|transparent|coke bottle/i, '#b9c9cc'],
  [/white|bone|cream/i, '#e8e4d8'],
  [/red|magenta/i, '#b3261e'],
  [/orange|amber/i, '#e07b24'],
  [/yellow|gold/i, '#d9b13b'],
  [/green/i, '#2f7d4a'],
  [/teal|turquoise|cyan/i, '#1f8f96'],
  [/blue/i, '#2f86a6'],
  [/purple|violet|galaxy/i, '#6b48b0'],
  [/pink/i, '#d7788f'],
  [/silver|gr[ae]y|smoke/i, '#8f8f98'],
  [/brown/i, '#7a5233'],
];

/** The first colour named in an edition description, or black vinyl. */
export function discColor(description: string): string {
  let best: { at: number; colour: string } | undefined;
  for (const [pattern, colour] of DISC_COLOURS) {
    const at = description.search(pattern);
    if (at >= 0 && (!best || at < best.at)) best = { at, colour };
  }
  return best?.colour ?? '#202026';
}

/** CSS background drawing a grooved record in one colour. */
export const grooves = (colour: string) =>
  `repeating-radial-gradient(circle, ${colour} 0 3px, color-mix(in srgb, ${colour} 78%, #fff) 3px 4px, ${colour} 4px 6px)`;
