import { contrast, mix, relight, toOklch, fromOklch } from './color';

export const MODES = ['light', 'dark', 'night'] as const;
export type Mode = (typeof MODES)[number];
export const APPEARANCES = ['auto', ...MODES] as const;
export type Appearance = (typeof APPEARANCES)[number];

export interface CoverColors {
  /** The colour that fills most of the cover. */
  main: string;
  /** Its most prominent second colour. */
  pop: string;
}

/** Used until a record with a readable cover has been in focus. */
export const NEUTRAL: CoverColors = { main: '#161618', pop: '#7fd1d9' };

export interface Theme {
  /** The main cover colour, only lightened or darkened as far as the mode needs. */
  bg: string;
  surface: string;
  line: string;
  lineStrong: string;
  text: string;
  muted: string;
  /** The second cover colour, adjusted until it reads as text or an outline. */
  accent: string;
  /** The second cover colour as it is, for filled shapes. */
  fill: string;
  /** Text and icons on a filled shape. */
  fillInk: string;
  /** The second cover colour behind and around artwork. */
  glow: string;
  danger: string;
  /** CSS filter for artwork. */
  art: string;
}

const BLACK = '#000000';
const WHITE = '#ffffff';

/**
 * Lightens (`step` 1) or darkens (`step` -1) a colour, keeping its hue, until it
 * has the wanted contrast against every background.
 */
function readable(colour: string, step: 1 | -1, backgrounds: string[], min: number): string {
  const passes = (c: string) => backgrounds.every((bg) => contrast(c, bg) >= min);
  if (passes(colour)) return colour;
  for (let l = toOklch(colour)[0] + step * 0.01; l > 0 && l < 1; l += step * 0.01) {
    const candidate = relight(colour, l);
    if (passes(candidate)) return candidate;
  }
  return step > 0 ? WHITE : BLACK;
}

/**
 * Colours the page with two colours from a cover: the main one fills it and the
 * second one marks highlights. The mode only changes how light they are. Text
 * and highlights are adjusted until they are readable, whatever the cover looks
 * like.
 */
export function themeFor({ main, pop }: CoverColors, mode: Mode): Theme {
  const [l, chroma, hue] = toOklch(main);
  const light = mode === 'light';
  const night = mode === 'night';
  // A strong colour can stay nearer its own lightness than black, white or grey.
  const strength = Math.min(1, chroma / 0.12);
  const lightness = light
    ? Math.min(0.95, Math.max(0.93 - 0.13 * strength, l))
    : night
      ? Math.min(0.14 + 0.09 * strength, l * 0.8)
      : Math.min(0.26 + 0.18 * strength, l);
  const bg = relight(main, lightness);
  // Cards are lighter than the page, except on a page too bright for that in the dark.
  const surface = light ? mix(bg, WHITE, 0.5) : lightness > 0.32 ? mix(bg, BLACK, 0.18) : mix(bg, WHITE, night ? 0.05 : 0.09);
  const backgrounds = [bg, surface];
  const toward = light ? -1 : 1;

  const text = readable(
    light
      ? fromOklch(0.22, Math.min(chroma, 0.05), hue)
      : night
        ? mix(mix(bg, '#ffe2bd', 0.82), BLACK, 0.16)
        : fromOklch(0.97, Math.min(chroma, 0.02), hue),
    toward,
    backgrounds,
    light ? 9 : 4.6,
  );
  // Night dims the highlight colour as much as it dims the artwork.
  const fill = night ? mix(pop, BLACK, 0.25) : pop;

  return {
    bg,
    surface,
    line: mix(bg, light ? BLACK : WHITE, light ? 0.1 : night ? 0.08 : 0.13),
    lineStrong: mix(bg, light ? BLACK : WHITE, light ? 0.2 : night ? 0.16 : 0.25),
    text,
    muted: readable(mix(text, bg, 0.22), toward, backgrounds, 4.6),
    accent: readable(fill, toward, backgrounds, 4.6),
    fill,
    // The page colour on the second colour keeps to the cover; otherwise black or white.
    fillInk: contrast(bg, fill) >= 4.6 ? bg : contrast(BLACK, fill) > contrast(WHITE, fill) ? BLACK : WHITE,
    glow: night ? mix(pop, BLACK, 0.45) : pop,
    danger: readable(light ? '#8c1d12' : '#ff9d94', toward, backgrounds, 4.6),
    art: night ? 'brightness(0.72) saturate(0.9)' : 'none',
  };
}

export const resolveMode = (appearance: Appearance, phonePrefersLight: boolean): Mode =>
  appearance === 'auto' ? (phonePrefersLight ? 'light' : 'dark') : appearance;

export const nextMode = (mode: Mode): Mode => MODES[(MODES.indexOf(mode) + 1) % MODES.length];
