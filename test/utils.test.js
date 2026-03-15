import { describe, it, expect } from 'vitest';
import { randomWithinRange, getMaxOfArray } from '../src/utils.js';

describe('randomWithinRange', () => {
  it('returns a value within the given range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomWithinRange([5, 10]);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('returns exact value when range is a single point', () => {
    expect(randomWithinRange([7, 7])).toBe(7);
  });
});

describe('getMaxOfArray', () => {
  it('returns the maximum value', () => {
    expect(getMaxOfArray([1, 5, 3])).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(getMaxOfArray([-10, -3, -7])).toBe(-3);
  });

  it('handles single element', () => {
    expect(getMaxOfArray([42])).toBe(42);
  });
});
