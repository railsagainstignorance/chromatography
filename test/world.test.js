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
  DYES.addAmounts(world.paperSpotLost.dyeAmounts, dyeTotals);
  const waterTotal = waterInPaper + waterOnSurface
    + world.waterSpotLost.waterAmount
    + world.paperSpotLost.waterAmount
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

describe('waterSource', () => {
  it('no-ops when WaterSourceEnabled is false', () => {
    const world = createSmallWorld(10, { WaterSourceEnabled: false });
    world.stepThroughProcess('waterSource');
    const totals = totalWaterAndDyes(world);
    expect(totals.waterOnSurface).toBe(0);
    expect(world.waterSourceAddedToSurface.waterAmount).toBe(0);
  });

  it('adds water to cells in the source band only', () => {
    const world = createSmallWorld(10, {
      WaterSourceEnabled: true,
      WaterSourceYRange: [0, 0.1],
      WaterSourceAmountPerCell: 1,
      WaterSourceMaxPerCell: 5,
    });
    world.stepThroughProcess('waterSource');

    // Source band: y=0 (floor(0*10) to floor(0.1*10)=1)
    for (let x = 0; x < world.width; x++) {
      const sourceCell = world.grid[0][x].getCellNextValue();
      expect(sourceCell.waterSpot.waterAmount).toBe(1);
    }
    // Cells below the band should have no water
    for (let x = 0; x < world.width; x++) {
      const belowCell = world.grid[2][x].getCellNextValue();
      expect(belowCell.waterSpot.waterAmount).toBe(0);
    }
  });

  it('does not exceed WaterSourceMaxPerCell', () => {
    const world = createSmallWorld(10, {
      WaterSourceEnabled: true,
      WaterSourceYRange: [0, 0.1],
      WaterSourceAmountPerCell: 3,
      WaterSourceMaxPerCell: 5,
    });
    // Run multiple times to try to exceed the cap
    for (let i = 0; i < 5; i++) {
      world.stepThroughProcess('waterSource');
    }
    const cell = world.grid[0][0].getCellNextValue();
    expect(cell.waterSpot.waterAmount).toBe(5);
  });

  it('adds no dye to source cells', () => {
    const world = createSmallWorld(10, {
      WaterSourceEnabled: true,
      WaterSourceYRange: [0, 0.1],
      WaterSourceAmountPerCell: 1,
      WaterSourceMaxPerCell: 5,
    });
    world.stepThroughProcess('waterSource');
    const cell = world.grid[0][0].getCellNextValue();
    for (let d = 0; d < DYES.length; d++) {
      expect(cell.waterSpot.dyeAmounts[d]).toBe(0);
    }
  });

  it('tracks added water in waterSourceAddedToSurface', () => {
    const world = createSmallWorld(10, {
      WaterSourceEnabled: true,
      WaterSourceYRange: [0, 0.1],
      WaterSourceAmountPerCell: 1,
      WaterSourceMaxPerCell: 5,
    });
    world.stepThroughProcess('waterSource');

    // Count how many cells are in the source band
    let cellsInBand = 0;
    for (let y = world.waterSourceYMin; y <= world.waterSourceYMax; y++) {
      cellsInBand += world.width;
    }
    expect(world.waterSourceAddedToSurface.waterAmount).toBe(cellsInBand * 1);
  });
});

describe('boundary behaviour', () => {
  it('edge cells do not accumulate more dye than interior cells', () => {
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

    // With absorbing boundaries, edge cells should not accumulate more dye
    expect(edgeDye).toBeLessThanOrEqual(nearEdgeDye);
  });
});
