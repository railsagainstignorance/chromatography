import { describe, it, expect } from 'vitest';
import { DYES } from '../src/dyes.js';

describe('DYES', () => {
  it('has 3 dyes', () => {
    expect(DYES.length).toBe(3);
  });

  it('each dye has Rf between 0 and 1', () => {
    for (const dye of DYES) {
      expect(dye.Rf).toBeGreaterThanOrEqual(0);
      expect(dye.Rf).toBeLessThanOrEqual(1);
    }
  });

  it('each dye has Rd between 0 and 1', () => {
    for (const dye of DYES) {
      expect(dye.Rd).toBeGreaterThanOrEqual(0);
      expect(dye.Rd).toBeLessThanOrEqual(1);
    }
  });
});

describe('DYES.newEmptyDyeAmounts', () => {
  it('returns array of zeros with length matching DYES', () => {
    const amounts = DYES.newEmptyDyeAmounts();
    expect(amounts).toEqual([0, 0, 0]);
    expect(amounts.length).toBe(DYES.length);
  });
});

describe('DYES.cloneAmounts', () => {
  it('returns a copy that is independent of the original', () => {
    const original = [1, 2, 3];
    const clone = DYES.cloneAmounts(original);
    expect(clone).toEqual([1, 2, 3]);
    clone[0] = 99;
    expect(original[0]).toBe(1);
  });
});

describe('DYES.copyAmounts', () => {
  it('copies values from source to destination', () => {
    const from = [10, 20, 30];
    const to = [0, 0, 0];
    DYES.copyAmounts(from, to);
    expect(to).toEqual([10, 20, 30]);
  });
});

describe('DYES.addAmounts', () => {
  it('adds source amounts to destination in place', () => {
    const from = [1, 2, 3];
    const to = [10, 20, 30];
    DYES.addAmounts(from, to);
    expect(to).toEqual([11, 22, 33]);
  });
});

describe('DYES.subtractAmounts', () => {
  it('subtracts source amounts from destination in place', () => {
    const from = [1, 2, 3];
    const to = [10, 20, 30];
    DYES.subtractAmounts(from, to);
    expect(to).toEqual([9, 18, 27]);
  });
});

describe('DYES.CMYKtoRGB', () => {
  it('converts pure white (no ink)', () => {
    const rgb = DYES.CMYKtoRGB([0, 0, 0, 0]);
    expect(rgb).toEqual([255, 255, 255, 255]);
  });

  it('converts pure black', () => {
    const rgb = DYES.CMYKtoRGB([0, 0, 0, 100]);
    expect(rgb).toEqual([0, 0, 0, 255]);
  });

  it('converts pure cyan', () => {
    const rgb = DYES.CMYKtoRGB([100, 0, 0, 0]);
    expect(rgb).toEqual([0, 255, 255, 255]);
  });

  it('converts pure magenta', () => {
    const rgb = DYES.CMYKtoRGB([0, 100, 0, 0]);
    expect(rgb).toEqual([255, 0, 255, 255]);
  });

  it('converts pure yellow', () => {
    const rgb = DYES.CMYKtoRGB([0, 0, 100, 0]);
    expect(rgb).toEqual([255, 255, 0, 255]);
  });
});

describe('DYES.combineDyesIntoRgbaPixel', () => {
  it('returns white for zero dye amounts', () => {
    const rgba = DYES.combineDyesIntoRgbaPixel([0, 0, 0], 1);
    expect(rgba).toEqual([255, 255, 255, 255]);
  });

  it('returns white when globalMax is zero', () => {
    const rgba = DYES.combineDyesIntoRgbaPixel([1, 0, 0], 0);
    expect(rgba).toEqual([255, 255, 255, 255]);
  });

  it('returns pure red for red-only dye at globalMax', () => {
    const rgba = DYES.combineDyesIntoRgbaPixel([1, 0, 0], 1);
    expect(rgba[0]).toBe(255); // R
    expect(rgba[1]).toBe(0);   // G
    expect(rgba[2]).toBe(0);   // B
    expect(rgba[3]).toBe(255); // alpha always full
  });

  it('returns saturated pink for red dye at half globalMax (gamma-boosted)', () => {
    const rgba = DYES.combineDyesIntoRgbaPixel([0.5, 0, 0], 1);
    // After gamma (0.45): 0.5^0.45 ≈ 0.73, white-lerp: G=B=floor((1-0.73)*255)=68
    expect(rgba[0]).toBe(255);
    expect(rgba[1]).toBe(68);
    expect(rgba[2]).toBe(68);
    expect(rgba[3]).toBe(255);
  });

  it('scales dye amounts relative to globalMax', () => {
    const rgba1 = DYES.combineDyesIntoRgbaPixel([10, 0, 0], 10);
    const rgba2 = DYES.combineDyesIntoRgbaPixel([1, 0, 0], 1);
    // Both should produce the same result (dye at globalMax)
    expect(rgba1).toEqual(rgba2);
  });
});

describe('DYES.combineCMYDyesIntoRgbaPixel', () => {
  it('returns white for zero dye amounts', () => {
    const rgba = DYES.combineCMYDyesIntoRgbaPixel([0, 0, 0], 1);
    expect(rgba).toEqual([255, 255, 255, 255]);
  });

  it('returns white when globalMax is zero', () => {
    const rgba = DYES.combineCMYDyesIntoRgbaPixel([1, 0, 0], 0);
    expect(rgba).toEqual([255, 255, 255, 255]);
  });

  it('returns cyan for red dye at globalMax', () => {
    // Red dye has CMYKPattern [100, 0, 0, 0] (cyan ink)
    // At globalMax: cmykTotals=[100*globalMax], scaled by /globalMax → [100,0,0,0] → 100% cyan
    const rgba = DYES.combineCMYDyesIntoRgbaPixel([5, 0, 0], 5);
    expect(rgba[0]).toBe(0);
    expect(rgba[1]).toBe(255);
    expect(rgba[2]).toBe(255);
  });

  it('scales relative to globalMax', () => {
    const rgba1 = DYES.combineCMYDyesIntoRgbaPixel([10, 0, 0], 10);
    const rgba2 = DYES.combineCMYDyesIntoRgbaPixel([5, 0, 0], 5);
    expect(rgba1).toEqual(rgba2);
  });
});
