import { describe, it, expect, beforeEach } from 'vitest';
import { setupCAWorldExtensions, createWorldOfBlottingPaperAndDyes } from '../src/world.js';
import { DYES } from '../src/dyes.js';
import { WaterSpot } from '../src/water-spot.js';

setupCAWorldExtensions();

function createSmallWorld(size = 5, config = {}) {
  return createWorldOfBlottingPaperAndDyes(size, size, config);
}

function totalWaterAndDyes(world) {
  const dyeTotals = DYES.newEmptyDyeAmounts();
  let waterInPaper = 0;
  let waterOnSurface = 0;

  for (let x = 0; x < world.width; x++) {
    for (let y = 0; y < world.height; y++) {
      const cell = world.grid[y][x].getCellNextValue();
      DYES.addAmounts(cell.paperSpot.dyeAmounts, dyeTotals);
      DYES.addAmounts(cell.waterSpot.dyeAmounts, dyeTotals);
      waterInPaper += cell.paperSpot.waterAmount;
      waterOnSurface += cell.waterSpot.waterAmount;
    }
  }

  // Add lost/evaporated amounts for full accounting
  DYES.addAmounts(world.waterSpotLost.dyeAmounts, dyeTotals);
  const waterTotal = waterInPaper + waterOnSurface
    + world.waterSpotLost.waterAmount
    + world.waterEvaporationFromPaper.waterAmount
    + world.waterEvaporationFromSurface.waterAmount;

  return { dyeTotals, waterInPaper, waterOnSurface, waterTotal };
}

describe('createWorldOfBlottingPaperAndDyes', () => {
  it('creates a world with the given dimensions', () => {
    const world = createSmallWorld(5);
    expect(world.width).toBe(5);
    expect(world.height).toBe(5);
  });

  it('initialises all cells with zero water and dye', () => {
    const world = createSmallWorld(3);
    const totals = totalWaterAndDyes(world);
    expect(totals.waterInPaper).toBe(0);
    expect(totals.waterOnSurface).toBe(0);
    expect(totals.dyeTotals).toEqual([0, 0, 0]);
  });
});

describe('addDroplets', () => {
  it('adds water and dyes to the specified cell', () => {
    const world = createSmallWorld(5);
    const drop = new WaterSpot(10, [1, 2, 3]);
    world.addDroplets([{ x: 2, y: 2, droplet: drop }]);

    const cell = world.grid[2][2].getCellNextValue();
    expect(cell.waterSpot.waterAmount).toBe(10);
    expect(cell.waterSpot.dyeAmounts).toEqual([1, 2, 3]);
  });
});

describe('conservation', () => {
  let world;

  beforeEach(() => {
    world = createSmallWorld(5);
    const drop = new WaterSpot(5, [10, 20, 30]);
    world.addDroplets([{ x: 2, y: 2, droplet: drop }]);
  });

  function getConservedTotals() {
    return totalWaterAndDyes(world);
  }

  it('absorption conserves water and dyes', () => {
    const before = getConservedTotals();
    world.stepThroughProcess('absorption');
    const after = getConservedTotals();

    expect(after.waterTotal).toBeCloseTo(before.waterTotal, 10);
    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 10);
    }
  });

  it('absorption moves water from surface into paper', () => {
    const before = getConservedTotals();
    expect(before.waterOnSurface).toBe(5);
    expect(before.waterInPaper).toBe(0);

    world.stepThroughProcess('absorption');
    const after = getConservedTotals();

    expect(after.waterOnSurface).toBeLessThan(before.waterOnSurface);
    expect(after.waterInPaper).toBeGreaterThan(0);
  });

  it('surfaceFlow conserves water and dyes', () => {
    const before = getConservedTotals();
    world.stepThroughProcess('surfaceFlow');
    const after = getConservedTotals();

    expect(after.waterTotal).toBeCloseTo(before.waterTotal, 10);
    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 10);
    }
  });

  it('capillaryFlow conserves water and dyes when water is in paper', () => {
    // First absorb so there's water in the paper to flow
    world.stepThroughProcess('absorption');
    const before = getConservedTotals();
    world.stepThroughProcess('capillaryFlow');
    const after = getConservedTotals();

    expect(after.waterTotal).toBeCloseTo(before.waterTotal, 10);
    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 10);
    }
  });

  it('diffusion conserves dyes', () => {
    // Absorb first so dyes are in the paper for diffusion to act on
    world.stepThroughProcess('absorption');
    const before = getConservedTotals();
    world.stepThroughProcess('diffusion');
    const after = getConservedTotals();

    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 10);
    }
  });

  it('evaporation reduces water but conserves dyes', () => {
    const before = getConservedTotals();
    world.stepThroughProcess('evaporation');
    const after = getConservedTotals();

    // Water should be conserved when accounting for evaporation
    expect(after.waterTotal).toBeCloseTo(before.waterTotal, 10);
    // Dyes should not evaporate
    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 10);
    }
  });

  it('full step conserves water and dyes', () => {
    const before = getConservedTotals();
    world.stepWithCount();
    const after = getConservedTotals();

    expect(after.waterTotal).toBeCloseTo(before.waterTotal, 5);
    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 5);
    }
  });

  it('10 full steps conserve water and dyes', () => {
    const before = getConservedTotals();
    for (let i = 0; i < 10; i++) {
      world.stepWithCount();
    }
    const after = getConservedTotals();

    expect(after.waterTotal).toBeCloseTo(before.waterTotal, 3);
    for (let d = 0; d < DYES.length; d++) {
      expect(after.dyeTotals[d]).toBeCloseTo(before.dyeTotals[d], 3);
    }
  });
});

describe('boundary behaviour', () => {
  it('edge cells accumulate more dye than centre after many steps (documents rim bug)', () => {
    const world = createSmallWorld(7);
    // Place drop in centre
    const drop = new WaterSpot(50, [100, 100, 100]);
    world.addDroplets([{ x: 3, y: 3, droplet: drop }]);

    for (let i = 0; i < 50; i++) {
      world.stepWithCount();
    }

    // Check edge vs interior dye concentration
    const edgeCell = world.grid[0][0].getCellNextValue();
    const nearEdgeCell = world.grid[1][1].getCellNextValue();
    const edgeDye = edgeCell.paperSpot.dyeAmounts.reduce((a, b) => a + b, 0);
    const nearEdgeDye = nearEdgeCell.paperSpot.dyeAmounts.reduce((a, b) => a + b, 0);

    // This documents the current behaviour — edge accumulation
    // When the rim bug is fixed, this test should be updated
    console.log(`Edge dye: ${edgeDye.toFixed(4)}, near-edge dye: ${nearEdgeDye.toFixed(4)}`);
  });
});
