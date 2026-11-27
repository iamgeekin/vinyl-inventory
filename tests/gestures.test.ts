import { describe, expect, it } from 'vitest';
import { dismissesSheet, lockAxis, rowOffset, rowStaysOpen, swipeStep } from '../src/gestures/math';

describe('gestures', () => {
  it('waits until a drag has a direction, and leaves slanted ones to scrolling', () => {
    expect(lockAxis(4, 4)).toBeNull();
    expect(lockAxis(-20, 5)).toBe('x');
    expect(lockAxis(5, 20)).toBe('y');
    expect(lockAxis(15, 14)).toBe('y');
  });

  it('lets a row follow the finger, resisting past either end', () => {
    expect(rowOffset(-90, 160)).toBe(-90);
    expect(rowOffset(50, 160)).toBe(10);
    expect(rowOffset(-210, 160)).toBe(-170);
  });

  it('leaves a row open or shut by flick first, then by how far it went', () => {
    expect(rowStaysOpen(-100, 0, 160)).toBe(true);
    expect(rowStaysOpen(-60, 0, 160)).toBe(false);
    expect(rowStaysOpen(-20, -0.8, 160)).toBe(true);
    expect(rowStaysOpen(-150, 0.8, 160)).toBe(false);
  });

  it('steps to the next record on a swipe left and the previous on a swipe right', () => {
    expect(swipeStep(-90, 0)).toBe(1);
    expect(swipeStep(90, 0)).toBe(-1);
    expect(swipeStep(-30, -0.9)).toBe(1);
    expect(swipeStep(-30, 0)).toBe(0);
    // Flicked back towards where it started.
    expect(swipeStep(-30, 0.9)).toBe(0);
    expect(swipeStep(0, 0)).toBe(0);
  });

  it('puts a sheet away only when pulled far or flicked down', () => {
    expect(dismissesSheet(150, 0)).toBe(true);
    expect(dismissesSheet(60, 0.9)).toBe(true);
    expect(dismissesSheet(60, 0)).toBe(false);
    expect(dismissesSheet(20, 0.9)).toBe(false);
  });
});
