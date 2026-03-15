import { describe, it, expect } from 'vitest';
import { PaperSpot } from '../src/paper-spot.js';
import { WaterSpot } from '../src/water-spot.js';
import { CellSpot } from '../src/cell-spot.js';

describe('PaperSpot', () => {
  it('initialises with empty dye amounts and zero water', () => {
    const ps = new PaperSpot();
    expect(ps.dyeAmounts).toEqual([0, 0, 0]);
    expect(ps.waterAmount).toBe(0);
  });

  it('initialises with given dye amounts and water', () => {
    const ps = new PaperSpot([1, 2, 3], 0.5);
    expect(ps.dyeAmounts).toEqual([1, 2, 3]);
    expect(ps.waterAmount).toBe(0.5);
  });

  it('clones independently', () => {
    const ps = new PaperSpot([1, 2, 3], 0.5);
    const clone = ps.clone();
    expect(clone.dyeAmounts).toEqual([1, 2, 3]);
    expect(clone.waterAmount).toBe(0.5);
    clone.waterAmount = 99;
    expect(ps.waterAmount).toBe(0.5);
  });

  it('copies from another PaperSpot', () => {
    const ps1 = new PaperSpot([1, 2, 3], 0.5);
    const ps2 = new PaperSpot();
    ps2.copy(ps1);
    expect(ps2.dyeAmounts).toEqual([1, 2, 3]);
    expect(ps2.waterAmount).toBe(0.5);
  });

  it('addDroplet caps water at MaxWaterCapacity', () => {
    const ps = new PaperSpot(null, 0.9);
    const drop = { waterAmount: 0.5, dyeAmounts: [1, 1, 1] };
    ps.addDroplet(drop);
    expect(ps.waterAmount).toBe(1); // capped at MaxWaterCapacity default of 1
    expect(ps.dyeAmounts).toEqual([1, 1, 1]);
  });

  it('respects custom MaxWaterCapacity', () => {
    const ps = new PaperSpot(null, 0, { MaxWaterCapacity: 5 });
    expect(ps.MaxWaterCapacity).toBe(5);
  });
});

describe('WaterSpot', () => {
  it('initialises with zero water and empty dyes', () => {
    const ws = new WaterSpot();
    expect(ws.waterAmount).toBe(0);
    expect(ws.dyeAmounts).toEqual([0, 0, 0]);
  });

  it('initialises with given values', () => {
    const ws = new WaterSpot(10, [1, 2, 3]);
    expect(ws.waterAmount).toBe(10);
    expect(ws.dyeAmounts).toEqual([1, 2, 3]);
  });

  it('clones independently', () => {
    const ws = new WaterSpot(10, [1, 2, 3]);
    const clone = ws.clone();
    clone.waterAmount = 99;
    clone.dyeAmounts[0] = 99;
    expect(ws.waterAmount).toBe(10);
    expect(ws.dyeAmounts[0]).toBe(1);
  });

  it('addDroplet accumulates water and dyes', () => {
    const ws = new WaterSpot(10, [1, 2, 3]);
    const drop = { waterAmount: 5, dyeAmounts: [10, 20, 30] };
    ws.addDroplet(drop);
    expect(ws.waterAmount).toBe(15);
    expect(ws.dyeAmounts).toEqual([11, 22, 33]);
  });

  it('divideBy divides water and all dyes', () => {
    const ws = new WaterSpot(10, [4, 8, 12]);
    ws.divideBy(2);
    expect(ws.waterAmount).toBe(5);
    expect(ws.dyeAmounts).toEqual([2, 4, 6]);
  });

  it('createBigRandomDrop creates a drop with given volume', () => {
    const drop = WaterSpot.createBigRandomDrop(100, 1);
    expect(drop.waterAmount).toBe(100);
    expect(drop.dyeAmounts.length).toBe(3);
    for (const amount of drop.dyeAmounts) {
      expect(amount).toBeGreaterThanOrEqual(0);
      expect(amount).toBeLessThanOrEqual(100);
    }
  });
});

describe('CellSpot', () => {
  it('initialises with default paper and water spots', () => {
    const cs = new CellSpot();
    expect(cs.paperSpot.waterAmount).toBe(0);
    expect(cs.waterSpot.waterAmount).toBe(0);
  });

  it('clones independently', () => {
    const cs = new CellSpot();
    cs.paperSpot.waterAmount = 0.5;
    const clone = cs.clone();
    clone.paperSpot.waterAmount = 99;
    expect(cs.paperSpot.waterAmount).toBe(0.5);
  });

  it('addDroplet delegates to waterSpot', () => {
    const cs = new CellSpot();
    const drop = { waterAmount: 5, dyeAmounts: [1, 2, 3] };
    cs.addDroplet(drop);
    expect(cs.waterSpot.waterAmount).toBe(5);
    expect(cs.waterSpot.dyeAmounts).toEqual([1, 2, 3]);
  });

  it('copy copies both paper and water spots', () => {
    const cs1 = new CellSpot();
    cs1.paperSpot.waterAmount = 0.5;
    cs1.waterSpot.waterAmount = 10;
    const cs2 = new CellSpot();
    cs2.copy(cs1);
    expect(cs2.paperSpot.waterAmount).toBe(0.5);
    expect(cs2.waterSpot.waterAmount).toBe(10);
  });
});
