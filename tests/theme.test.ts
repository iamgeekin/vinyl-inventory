import { describe, expect, it } from 'vitest';
import { clampIndex, coverSizeFor, dragSteps, placement } from '../src/components/shelf/slider';
import { sampleRecords } from '../src/data/sample';
import { sortMark } from '../src/data/sort';
import { normalizeRecord } from '../src/data/types';
import { contrast, fromHsl, luminance, toHex, toHsl } from '../src/theme/color';
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
  buttonLabel: contrast(t.accentInk, t.accent),
  dangerOnPage: contrast(t.danger, t.bg),
});

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

  it('tint the whole page with the cover colour, and only change how light it is', () => {
    const cover = { main: '#b3261e', pop: '#f6b13d' };
    const [light, dark, night] = MODES.map((mode) => themeFor(cover, mode));
    for (const theme of [light, dark, night]) {
      const [hue, saturation] = toHsl(theme.bg);
      expect(Math.min(hue, 360 - hue)).toBeLessThan(8);
      expect(saturation).toBeGreaterThan(0.5);
    }
    expect(luminance(light.bg)).toBeGreaterThan(luminance(dark.bg));
    expect(luminance(dark.bg)).toBeGreaterThan(luminance(night.bg));
    expect(night.art).toContain('brightness');
  });

  it('give a black cover the hue of its second colour', () => {
    const [hue] = toHsl(themeFor({ main: '#161616', pop: '#9a6fe8' }, 'dark').bg);
    expect(hue).toBeGreaterThan(240);
    expect(hue).toBeLessThan(290);
  });

  it('leave a black and white cover grey', () => {
    expect(toHsl(themeFor({ main: '#ffffff', pop: '#000000' }, 'dark').bg)[1]).toBeLessThan(0.1);
  });

  it('round-trips through hue, saturation and lightness', () => {
    expect(fromHsl(...toHsl('#2f86a6'))).toBe('#2f86a6');
  });

  it('finds the main colour and a vivid second one', () => {
    const paint = (colours: [string, number][]) => {
      const data: number[] = [];
      for (const [hex, count] of colours) {
        for (let i = 0; i < count; i++) {
          data.push(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255);
        }
      }
      return new Uint8ClampedArray(data);
    };
    expect(extractColors(paint([['#102040', 700], ['#909090', 200], ['#f6b13d', 100]]))).toEqual({ main: '#102040', pop: '#f6b13d' });
    expect(extractColors(paint([['#445566', 100]]))).toEqual({ main: '#445566', pop: '#445566' });
    expect(extractColors(new Uint8ClampedArray(0)).main).toMatch(/^#/);
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
