import { describe, expect, it } from 'vitest';
import { clampIndex, coverSizeFor, dragSteps, placement } from '../src/components/shelf/slider';
import { sampleRecords } from '../src/data/sample';
import { sortMark } from '../src/data/sort';
import { normalizeRecord } from '../src/data/types';
import { contrast, fromOklch, luminance, rgb, toHex, toOklch } from '../src/theme/color';
import { extractColors } from '../src/theme/extract';
import { MODES, nextMode, resolveMode, themeFor, type CoverColors, type Theme } from '../src/theme/palette';

/** Every pairing of text and background that the screens use. */
const pairs = (t: Theme) => ({
  textOnPage: contrast(t.text, t.bg),
  textOnCard: contrast(t.text, t.surface),
  mutedOnPage: contrast(t.muted, t.bg),
  mutedOnCard: contrast(t.muted, t.surface),
  accentOnPage: contrast(t.accent, t.bg),
  accentOnCard: contrast(t.accent, t.surface),
  buttonLabel: contrast(t.fillInk, t.fill),
  dangerOnPage: contrast(t.danger, t.bg),
  dangerOnCard: contrast(t.danger, t.surface),
});

/** Degrees between the hues of two colours. */
const hueGap = (a: string, b: string) => {
  const turn = Math.abs(toOklch(a)[2] - toOklch(b)[2]);
  return (Math.min(turn, 2 * Math.PI - turn) * 180) / Math.PI;
};

/** RGBA pixels holding each colour the given number of times. */
const paint = (colours: [string, number][]) =>
  new Uint8ClampedArray(colours.flatMap(([hex, count]) => Array.from({ length: count }, () => [...rgb(hex), 255]).flat()));

/** A repeatable spread of colour pairs, including the extremes. */
function manyCovers(): CoverColors[] {
  let seed = 7;
  const next = () => (seed = (seed * 48271) % 2147483647) % 256;
  const random = () => toHex([next(), next(), next()]);
  const extremes = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#808080', '#ff00ff'];
  return [
    ...extremes.flatMap((main) => extremes.map((pop) => ({ main, pop }))),
    ...Array.from({ length: 600 }, () => ({ main: random(), pop: random() })),
  ];
}

describe('cover colours', () => {
  it('stay readable in every mode, whatever the cover', () => {
    const failures: string[] = [];
    for (const cover of manyCovers()) {
      for (const mode of MODES) {
        for (const [name, ratio] of Object.entries(pairs(themeFor(cover, mode)))) {
          if (ratio < 4.5) failures.push(`${cover.main} ${cover.pop} ${mode} ${name} ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('fill the page with the main cover colour and highlight with the second', () => {
    const cover = { main: '#b3261e', pop: '#f6b13d' };
    const [light, dark, night] = MODES.map((mode) => themeFor(cover, mode));
    for (const theme of [light, dark, night]) {
      expect(hueGap(theme.bg, cover.main)).toBeLessThan(6);
      expect(toOklch(theme.bg)[1]).toBeGreaterThan(0.08);
      expect(hueGap(theme.accent, cover.pop)).toBeLessThan(12);
    }
    expect(luminance(light.bg)).toBeGreaterThan(luminance(dark.bg));
    expect(luminance(dark.bg)).toBeGreaterThan(luminance(night.bg));
    expect(night.art).toContain('brightness');
  });

  it('use the cover colours exactly where the mode allows it', () => {
    const navy = themeFor({ main: '#0f2d4a', pop: '#f1c84b' }, 'dark');
    expect(navy).toMatchObject({ bg: '#0f2d4a', fill: '#f1c84b', accent: '#f1c84b', glow: '#f1c84b' });
    const cream = themeFor({ main: '#e9e2cf', pop: '#7a2e1d' }, 'light');
    expect(cream).toMatchObject({ bg: '#e9e2cf', fill: '#7a2e1d', accent: '#7a2e1d' });
    for (const mode of ['light', 'dark'] as const) {
      expect(themeFor({ main: '#b3261e', pop: '#9a6fe8' }, mode).fill).toBe('#9a6fe8');
    }
  });

  it('keep a black, white or grey cover neutral, with its second colour as the highlight', () => {
    for (const main of ['#161616', '#f4f4f4', '#808080']) {
      for (const mode of MODES) {
        const theme = themeFor({ main, pop: '#9a6fe8' }, mode);
        expect(toOklch(theme.bg)[1]).toBeLessThan(0.005);
        expect(hueGap(theme.accent, '#9a6fe8')).toBeLessThan(12);
      }
    }
    expect(themeFor({ main: '#161616', pop: '#9a6fe8' }, 'dark').bg).toBe('#161616');
  });

  it('round-trips through lightness, chroma and hue', () => {
    for (const hex of ['#2f86a6', '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']) {
      expect(fromOklch(...toOklch(hex))).toBe(hex);
    }
  });

  it('reads the main colour and a vivid second one', () => {
    expect(extractColors(paint([['#102040', 700], ['#909090', 200], ['#f6b13d', 100]]))).toEqual({ main: '#102040', pop: '#f6b13d' });
    expect(extractColors(paint([['#445566', 100]]))).toEqual({ main: '#445566', pop: '#445566' });
    expect(extractColors(new Uint8ClampedArray(0)).main).toMatch(/^#/);
  });

  it('counts close shades as one colour', () => {
    // Three nearly equal blues outweigh a red that is larger than any one of them.
    const { main, pop } = extractColors(paint([['#b3261e', 40], ['#1d5b82', 25], ['#21608a', 20], ['#1a5578', 15]]));
    expect(hueGap(main, '#1d5b82')).toBeLessThan(5);
    expect(pop).toBe('#b3261e');
  });

  it('prefers a colour to black that covers only a little more', () => {
    expect(extractColors(paint([['#000000', 52], ['#b3261e', 48]])).main).toBe('#b3261e');
    expect(extractColors(paint([['#000000', 75], ['#b3261e', 25]]))).toEqual({ main: '#000000', pop: '#b3261e' });
  });

  it('passes over specks when there is a larger second colour', () => {
    expect(extractColors(paint([['#e9e2cf', 900], ['#2f5d73', 90], ['#ff00ff', 10]])).pop).toBe('#2f5d73');
  });

  it('follows the phone only when set to match it', () => {
    expect(resolveMode('auto', true)).toBe('light');
    expect(resolveMode('auto', false)).toBe('dark');
    expect(resolveMode('night', true)).toBe('night');
    expect(MODES.map(nextMode)).toEqual(['dark', 'night', 'light']);
  });

  it('are kept with a record only when valid', () => {
    expect(normalizeRecord({ popColor: 'red', spineColor: '#123456' })).toMatchObject({ popColor: '', spineColor: '#123456' });
  });
});

describe('sideways slider', () => {
  it('puts the focused record largest and facing forward', () => {
    expect(placement(0)).toMatchObject({ scale: 1, turn: 0, opacity: 1 });
    expect(placement(-1).x).toBeLessThan(placement(0).x);
    expect(placement(1).x).toBeGreaterThan(placement(0).x);
    expect(placement(2).scale).toBeLessThan(placement(1).scale);
    expect(placement(-1).turn).toBe(-placement(1).turn);
    expect(placement(9).opacity).toBe(0);
  });

  it('turns a drag into whole records', () => {
    expect(dragSteps(0, 200)).toBe(0);
    expect(dragSteps(-30, 200)).toBe(0);
    expect(dragSteps(-100, 200)).toBe(1);
    expect(dragSteps(280, 200)).toBe(-3);
  });

  it('stays inside the collection and the screen', () => {
    expect(clampIndex(-2, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(coverSizeFor(844, 236)).toBe(220);
    expect(coverSizeFor(568, 100)).toBe(96);
    expect(coverSizeFor(2000, 900)).toBe(300);
  });

  it('labels the position for each sort order', () => {
    const quiet = sampleRecords('USD').find((r) => r.title === 'Paper Lanterns')!;
    expect(sortMark(quiet, 'artist')).toBe('Q');
    expect(sortMark(quiet, 'title')).toBe('P');
    expect(sortMark(quiet, 'year')).toBe('2018');
    expect(sortMark(quiet, 'price')).toBe('$36.00');
    expect(sortMark(quiet, 'purchased')).toContain('2025');
    expect(sortMark({ ...quiet, year: null }, 'year')).toBe('—');
  });
});
