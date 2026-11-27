/** Colour maths on `#rrggbb` strings. */

export const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const toHex = (channels: number[]): string =>
  `#${channels.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;

export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

/** Moves `from` towards `to`; `amount` runs from 0 to 1. */
export function mix(from: string, to: string, amount: number): string {
  const target = rgb(to);
  return toHex(rgb(from).map((c, i) => c + (target[i] - c) * amount));
}

/** Undoes the sRGB curve; `v` runs from 0 to 255, the result from 0 to 1. */
function linear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

const curved = (c: number) => 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Oklab, where equal distances look about equally different: lightness from 0 to
 * 1, then the green–red and blue–yellow axes.
 */
export function toOklab(channels: number[]): [number, number, number] {
  const [r, g, b] = channels.map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Lightness from 0 to 1, chroma (0 is grey) and hue in radians. */
export function toOklch(hex: string): [number, number, number] {
  const [l, a, b] = toOklab(rgb(hex));
  return [l, Math.hypot(a, b), Math.atan2(b, a)];
}

function linearRgb(L: number, C: number, h: number): number[] {
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Keeps lightness and hue, and gives up chroma only if a screen cannot show it. */
export function fromOklch(L: number, C: number, h: number): string {
  const lightness = Math.min(1, Math.max(0, L));
  const shows = (chroma: number) => linearRgb(lightness, chroma, h).every((c) => c >= -0.0005 && c <= 1.0005);
  let chroma = C;
  if (!shows(chroma)) {
    let [low, high] = [0, C];
    for (let i = 0; i < 24; i++) {
      const middle = (low + high) / 2;
      if (shows(middle)) low = middle;
      else high = middle;
    }
    chroma = low;
  }
  return toHex(linearRgb(lightness, chroma, h).map((c) => curved(Math.min(1, Math.max(0, c)))));
}

/** The same colour made lighter or darker. */
export function relight(hex: string, lightness: number): string {
  const [l, c, h] = toOklch(hex);
  return Math.abs(lightness - l) < 0.001 ? hex : fromOklch(lightness, c, h);
}
