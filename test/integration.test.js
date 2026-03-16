import { describe, it, expect } from 'vitest';
import { setupCAWorldExtensions, createWorldOfBlottingPaperAndDyes } from '../src/world.js';
import { DYES } from '../src/dyes.js';
import { WaterSpot } from '../src/water-spot.js';
import { convertWorldGridToGridOfDyeAmounts } from '../src/rendering.js';
import { RGBA_BYTES_PER_PIXEL, RGB_BYTE_MAX } from '../src/constants.js';

setupCAWorldExtensions();

function createMockImageData(w, h) {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * RGBA_BYTES_PER_PIXEL) };
}

function getPixel(imageData, x, y) {
  const offset = (x + y * imageData.width) * RGBA_BYTES_PER_PIXEL;
  return [
    imageData.data[offset],
    imageData.data[offset + 1],
    imageData.data[offset + 2],
    imageData.data[offset + 3],
  ];
}

function dominantHue(r, g, b) {
  const channels = [r, g, b];
  let minIndex = 0;
  for (let i = 1; i < channels.length; i++) {
    if (channels[i] < channels[minIndex]) {
      minIndex = i;
    }
  }
  return minIndex;
}

describe('full simulation integration', () => {
  it('produces colorful separated dye output', () => {
    const size = 20;
    const world = createWorldOfBlottingPaperAndDyes(size, size, {});

    // Deterministic centered droplet with equal dye amounts (avoids Math.random flakiness)
    const centre = 10;
    const radius = 2;
    const volume = 20;
    const dyeAmount = 50;
    const spotsWithCoords = [];
    for (let x = centre - radius; x <= centre + radius; x++) {
      for (let y = centre - radius; y <= centre + radius; y++) {
        if ((x - centre) ** 2 + (y - centre) ** 2 <= radius * radius) {
          spotsWithCoords.push({ x, y });
        }
      }
    }
    const numCells = spotsWithCoords.length;
    const perCellDye = [dyeAmount, dyeAmount, dyeAmount].map(d => d / numCells);
    spotsWithCoords.forEach(swc => {
      swc.droplet = new WaterSpot(volume / numCells, perCellDye);
    });
    world.addDroplets(spotsWithCoords);

    // Run simulation for 1000 iterations (the default maxIterations)
    for (let i = 0; i < 1000; i++) {
      world.stepWithCount();
    }

    // Extract combined (paper + surface) dye grid
    const grid = convertWorldGridToGridOfDyeAmounts(world, 'cellSpot');

    // Assertion 1: No dye reached any edge
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
          const totalDye = grid[x][y].reduce((sum, d) => sum + d, 0);
          expect(totalDye).toBeLessThan(0.15);
        }
      }
    }

    // Render to imageData in RGB mode
    const imageData = createMockImageData(size, size);
    DYES.writeGridOfDyeAmountsToImageData(grid, imageData, 'rgb');

    // Assertion 2: At least 2 different dominant hues (color separation, not monochrome)
    const huesFound = new Set();
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const [r, g, b] = getPixel(imageData, x, y);
        const isColored = r < RGB_BYTE_MAX || g < RGB_BYTE_MAX || b < RGB_BYTE_MAX;
        if (isColored) {
          huesFound.add(dominantHue(r, g, b));
        }
      }
    }
    expect(huesFound.size).toBeGreaterThanOrEqual(2);

    // Assertion 3: At least one pixel has visible color (channel noticeably below white)
    const SATURATION_THRESHOLD = Math.floor(RGB_BYTE_MAX * 0.9);
    let minChannel = RGB_BYTE_MAX;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const [r, g, b] = getPixel(imageData, x, y);
        minChannel = Math.min(minChannel, r, g, b);
      }
    }
    expect(minChannel).toBeLessThanOrEqual(SATURATION_THRESHOLD);
  });
});
