import { contrast, fromHsl, luminance, mix, toHsl } from './color';

export const MODES = ['light', 'dark', 'night'] as const;
export type Mode = (typeof MODES)[number];
export const APPEARANCES = ['auto', ...MODES] as const;
export type Appearance = (typeof APPEARANCES)[number];

export interface CoverColors {
  /** The colour that fills most of the cover. */
  main: string;
  /** Its strongest second colour. */
  pop: string;
}

/** Used until a record with a readable cover has been in focus. */
export const NEUTRAL: CoverColors = { main: '#161618', pop: '#7fd1d9' };

export interface Theme {
  bg: string;
  surface: string;
  line: string;
  lineStrong: string;
  text: string;
  muted: string;
  accent: string;
  accentInk: string;
  glow: string;
  danger: string;
  /** CSS filter for artwork. */
  art: string;
}

/** Steps `colour` towards `toward` until it passes. */
function until(colour: string, toward: string, passes: (c: string) => boolean): string {
  let result = colour;
  for (let i = 0; i < 60 && !passes(result); i++) result = mix(result, toward, 0.06);
  return passes(result) ? result : toward;
}

const BLACK = '#000000';
const WHITE = '#ffffff';

/**
 * Colours the whole page after a cover. The mode only changes how light that
 * colour is. Text, secondary text and highlights are adjusted until they are
 * readable, whatever the cover looks like.
 */
export function themeFor({ main, pop }: CoverColors, mode: Mode): Theme {
  let [h, s, l] = toHsl(main);
  // A black, white or grey cover borrows its hue from the second colour.
  if (s < 0.15) {
    h = toHsl(pop)[0];
    s = toHsl(pop)[1] < 0.05 ? 0.04 : 0.28;
  }

  if (mode === 'light') {
    const bg = until(fromHsl(h, Math.min(0.85, Math.max(s, 0.28)), 0.78), WHITE, (c) => luminance(c) >= 0.43);
    const surface = mix(bg, WHITE, 0.5);
    const deep = fromHsl(h, s, Math.min(l < 0.12 ? 0.3 : l, 0.45));
    const reads = (min: number) => (c: string) => contrast(c, bg) >= min;
    return {
      bg,
      surface,
      line: mix(bg, BLACK, 0.1),
      lineStrong: mix(bg, BLACK, 0.2),
      text: until(mix(deep, BLACK, 0.75), BLACK, reads(9)),
      muted: until(mix(deep, BLACK, 0.5), BLACK, reads(5)),
      accent: until(pop, BLACK, reads(4.8)),
      accentInk: WHITE,
      glow: mix(deep, WHITE, 0.15),
      danger: until('#8c1d12', BLACK, reads(4.8)),
      art: 'none',
    };
  }

  const night = mode === 'night';
  const lightness = night ? 0.1 : Math.min(0.27, Math.max(0.16, l));
  const bg = until(
    fromHsl(h, Math.min(s, night ? 0.75 : 0.8), lightness),
    BLACK,
    (c) => luminance(c) <= (night ? 0.016 : 0.07),
  );
  const surface = mix(bg, WHITE, night ? 0.05 : 0.09);
  const reads = (min: number) => (c: string) => contrast(c, surface) >= min;
  const accent = until(night ? mix(pop, BLACK, 0.2) : pop, WHITE, reads(night ? 4.8 : 5));
  const text = night ? mix(mix(bg, '#ffe2bd', 0.82), BLACK, 0.16) : mix(bg, WHITE, 0.93);
  return {
    bg,
    surface,
    line: mix(bg, WHITE, night ? 0.08 : 0.13),
    lineStrong: mix(bg, WHITE, night ? 0.16 : 0.25),
    text,
    muted: until(mix(text, bg, 0.4), WHITE, reads(night ? 4.6 : 5)),
    accent,
    accentInk: until(bg, BLACK, (c) => contrast(c, accent) >= 4.8),
    glow: mix(bg, pop, night ? 0.25 : 0.45),
    danger: until('#ff9d94', WHITE, reads(4.8)),
    art: night ? 'brightness(0.72) saturate(0.9)' : 'none',
  };
}

export const resolveMode = (appearance: Appearance, phonePrefersLight: boolean): Mode =>
  appearance === 'auto' ? (phonePrefersLight ? 'light' : 'dark') : appearance;

export const nextMode = (mode: Mode): Mode => MODES[(MODES.indexOf(mode) + 1) % MODES.length];
