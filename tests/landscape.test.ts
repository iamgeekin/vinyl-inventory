import { describe, expect, it } from 'vitest';
import {
  BEHIND, DIVIDER, clampIndex, clampPosition, crateFit, cratePose, indexEntries,
  litEntry, openness, pullOutSize, releaseTarget, shelfLayout,
} from '../src/components/shelf/landscape/layout';
import { sampleRecords } from '../src/data/sample';
import { groupLabels, sortMark, sortRecords } from '../src/data/sort';
import { defaultSettings, emptyRecord, type VinylRecord } from '../src/data/types';

const record = (patch: Partial<VinylRecord>, price: number | null = null, currency = 'USD'): VinylRecord => ({
  ...emptyRecord(currency),
  purchase: { price, currency, date: '', store: '' },
  ...patch,
});

describe('moving through the collection', () => {
  it('stays inside the collection, with a little give at the ends', () => {
    expect(clampIndex(-2, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampPosition(-3, 5)).toBe(-0.35);
    expect(clampPosition(9, 5)).toBeCloseTo(4.35);
    expect(clampPosition(2.4, 5)).toBe(2.4);
  });

  it('settles on the nearest record, carried further by a flick', () => {
    expect(releaseTarget(3.4, 0, 0, 40)).toBe(3);
    expect(releaseTarget(3.4, 0.02, 10, 40)).toBe(6);
    expect(releaseTarget(30, -0.02, 10, 40)).toBe(27);
    // A finger that rested before lifting did not flick.
    expect(releaseTarget(3.4, 0.02, 200, 40)).toBe(3);
    expect(releaseTarget(3, 5, 0, 40)).toBe(15);
    expect(releaseTarget(38, 5, 0, 40)).toBe(39);
  });
});

describe('pull-out shelf', () => {
  const widths = [24, 26, 28, 24, 30];
  const starts = [true, false, true, false, false];

  it('fits the sleeve to the height of the shelf', () => {
    expect(pullOutSize(236)).toBe(190);
    expect(pullOutSize(80)).toBe(96);
    expect(pullOutSize(600)).toBe(250);
  });

  it('pulls out only the record in focus, handing over between two', () => {
    expect(openness(2, 2)).toBe(1);
    expect(openness(1, 2)).toBe(0);
    expect(openness(2, 2.5) + openness(3, 2.5)).toBeCloseTo(1);
  });

  it('lines the records up with room for the one pulled out and the dividers', () => {
    const { items, centre } = shelfLayout(widths, starts, 1, 200);
    const open = 200 * 1.4 + 40;
    expect(items[0].x).toBe(DIVIDER);
    expect(items[1].x).toBe(DIVIDER + 24);
    expect(items[2].x).toBe(DIVIDER + 24 + open + DIVIDER);
    expect(centre).toBe(items[1].x + open / 2);
  });

  it('moves without jumping from one record to the next', () => {
    const at = (position: number) => shelfLayout(widths, starts, position, 200).centre;
    expect(Math.abs(at(1.999) - at(2))).toBeLessThan(1);
    expect(Math.abs(at(2.001) - at(2))).toBeLessThan(1);
    expect(at(-0.3)).toBeLessThan(at(0));
    expect(at(4.3)).toBeGreaterThan(at(4));
  });

  it('works with a single record', () => {
    expect(shelfLayout([24], [true], 0, 200).items).toHaveLength(1);
  });
});

describe('crate', () => {
  it('fits the sleeves to the space', () => {
    expect(crateFit(450, 320)).toMatchObject({ size: 183, step: 13 });
    expect(crateFit(300, 250)).toMatchObject({ step: 10 });
    expect(crateFit(450, 120).size).toBe(96);
    expect(crateFit(200, 600).size).toBeLessThan(150);
    expect(crateFit(900, 600).size).toBe(230);
    expect(crateFit(100, 600).left).toBe(22);
  });

  it('stands waiting sleeves higher and further back, and tips flipped ones forward', () => {
    expect(cratePose(0, 13)).toMatchObject({ tilt: 0, dim: 0, opacity: 1 });
    expect(cratePose(2, 13).y).toBe(-26);
    expect(cratePose(2, 13).z).toBeLessThan(cratePose(1, 13).z);
    expect(cratePose(-1, 13).tilt).toBeLessThan(-80);
    expect(cratePose(BEHIND, 13).opacity).toBe(0);
    expect(cratePose(-5, 13).opacity).toBe(0);
  });

  it('shortens a long index to names and dots, keeping both ends', () => {
    expect(indexEntries(3, 10).map((e) => e.group)).toEqual([0, 1, 2]);
    const long = indexEntries(26, 15);
    expect(long.length).toBeLessThanOrEqual(15);
    expect(long[0]).toEqual({ group: 0, named: true });
    expect(long.at(-1)).toEqual({ group: 25, named: true });
    expect(long.some((e) => !e.named)).toBe(true);
    expect(long.map((e) => e.group)).toEqual([...new Set(long.map((e) => e.group))].sort((a, b) => a - b));
  });

  it('lights the name of the current group, or the dot standing for it', () => {
    const entries = indexEntries(26, 15);
    for (let group = 0; group < 26; group++) {
      const n = litEntry(entries, group);
      if (entries[n].named) expect(entries[n].group).toBe(group);
      else {
        expect(entries[n - 1].group).toBeLessThan(group);
        expect(entries[n + 1].group).toBeGreaterThan(group);
      }
    }
  });
});

describe('sort order on the sideways shelf', () => {
  const quiet = sampleRecords('USD').find((r) => r.title === 'Paper Lanterns')!;

  it('labels the position for each sort order', () => {
    expect(sortMark(quiet, 'artist')).toBe('Q');
    expect(sortMark(quiet, 'title')).toBe('P');
    expect(sortMark(quiet, 'year')).toBe('2018');
    expect(sortMark(quiet, 'price')).toBe('$36.00');
    expect(sortMark(quiet, 'purchased')).toContain('2025');
    expect(sortMark({ ...quiet, year: null }, 'year')).toBe('—');
  });

  it('groups letters, keeping accented ones together and numbers apart', () => {
    const records = ['Eels', 'Étienne', '2814', 'The Fall'].map((artist) => record({ artist, title: artist }));
    expect(groupLabels(sortRecords(records, 'artist'), 'artist')).toEqual(['#', 'E', 'E', 'F']);
  });

  it('groups years and quarters', () => {
    expect(groupLabels([quiet], 'year')).toEqual(['2018']);
    expect(groupLabels([quiet], 'purchased')).toEqual(['Q4 ’25']);
    expect(groupLabels([record({})], 'purchased')).toEqual(['—']);
  });

  it('groups prices into round bands that suit the currency', () => {
    expect(groupLabels([record({}, 55), record({}, 36), record({}, 8.5), record({})], 'price')).toEqual(['$50+', '$30+', '$0+', '—']);
    expect(groupLabels([record({}, 6800, 'JPY'), record({}, 3200, 'JPY')], 'price').map((l) => l.replace(/[^\d+]/g, ''))).toEqual(['6000+', '3000+']);
    // With more than one currency a symbol would only split the groups up.
    expect(groupLabels([record({}, 55), record({}, 40, 'SGD')], 'price')).toEqual(['50+', '40+']);
  });

  it('shows the pull-out shelf until another layout is chosen', () => {
    expect(defaultSettings().landscapeLayout).toBe('pullout');
  });
});
