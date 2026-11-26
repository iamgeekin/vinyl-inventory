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

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Hue in degrees, saturation and lightness from 0 to 1. */
export function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const range = high - low;
  const l = (high + low) / 2;
  if (!range) return [0, 0, l];
  const h = high === r ? ((g - b) / range + 6) % 6 : high === g ? (b - r) / range + 2 : (r - g) / range + 4;
  return [h * 60, range / (1 - Math.abs(2 * l - 1)), l];
}

export function fromHsl(h: number, s: number, l: number): string {
  return toHex(
    [0, 8, 4].map((n) => {
      const k = (n + h / 30) % 12;
      return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
    }),
  );
}
