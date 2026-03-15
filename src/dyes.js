import { RGB_BYTE_MAX, RGB_CHANNELS, RGBA_CHANNELS, RGBA_BYTES_PER_PIXEL, CMYK_PERCENTAGE_MAX, FULL_OPACITY, WHITE_RGBA, RENDERING_GAMMA } from './constants.js';

export const DYES = [
  {
    name: 'red',
      Rf: 0.4,
      Rd: 0.007,
      RGBPattern: [1.0, 0, 0],
      CMYKPattern: [100, 0, 0, 0],
  },
  {
    name: 'green',
      Rf: 0.65,
      Rd: 0.0075,
      RGBPattern: [0, 1.0, 0],
      CMYKPattern: [0, 100, 0, 0],
  },
  {
    name: 'blue',
      Rf: 0.9,
      Rd: 0.006,
      RGBPattern: [0, 0, 1.0],
      CMYKPattern: [0, 0, 100, 0],
  },
];

{
  for (let dye of DYES) {
    if (dye.Rf > 1 || dye.Rf < 0) {
      throw new Error(`ERROR: Rf out of bounds: dye: ${JSON.stringify(dye)}`);
    }
    if (dye.Rd > 1 || dye.Rd < 0) {
      throw new Error(`ERROR: Rd out of bounds: dye: ${JSON.stringify(dye)}`);
    }
  }
}

DYES.newEmptyDyeAmounts = function() {
  return new Array(this.length).fill(0);
};

DYES.cloneAmounts = function(from) {
  return from.slice(0);
};

DYES.copyAmounts = function(from, to) {
  for (var i = 0; i < this.length; i++) {
    to[i] = from[i];
  }
};

DYES.addAmounts = function(from, to) {
  for (var i = 0; i < this.length; i++) {
    to[i] = to[i] + from[i];
  }
};

DYES.subtractAmounts = function(from, to) {
  for (var i = 0; i < this.length; i++) {
    to[i] = to[i] - from[i];
  }
};

DYES.combineDyesIntoRgbaPixel = function(dyeAmounts, globalMax) {
  if (!globalMax || globalMax <= 0) { return [...WHITE_RGBA]; }

  var rgba01 = new Array(RGB_CHANNELS).fill(0);
  for (var d = 0; d < this.length; d++) {
    for (var i = 0; i < RGB_CHANNELS; i++) {
      rgba01[i] += (dyeAmounts[d] / globalMax) * this[d].RGBPattern[i];
    }
  }

  // Gamma correction: boost mid-tone concentrations toward full saturation
  rgba01 = rgba01.map(c => Math.pow(c, RENDERING_GAMMA));

  var maxRGB01 = Math.max.apply(null, rgba01);
  if (maxRGB01 > 1.0) {
    rgba01 = rgba01.map(c => { return c / maxRGB01; });
    maxRGB01 = 1.0;
  }
  if (maxRGB01 == 0) { return [...WHITE_RGBA]; }

  // White→color: lerp from white based on intensity
  var rgba = rgba01.map(c => { return Math.floor((1.0 - maxRGB01 + c) * RGB_BYTE_MAX); });
  rgba.push(FULL_OPACITY);
  return rgba;
};

DYES.CMYKtoRGB = function(cmyk, a = FULL_OPACITY) {
  var rgb = new Array(RGBA_CHANNELS).fill(0);
  rgb[3] = a;

  var c = cmyk[0] / CMYK_PERCENTAGE_MAX;
  var m = cmyk[1] / CMYK_PERCENTAGE_MAX;
  var y = cmyk[2] / CMYK_PERCENTAGE_MAX;
  var k = cmyk[3] / CMYK_PERCENTAGE_MAX;

  rgb[0] = 1 - Math.min(1, c * (1 - k) + k);
  rgb[1] = 1 - Math.min(1, m * (1 - k) + k);
  rgb[2] = 1 - Math.min(1, y * (1 - k) + k);

  rgb[0] = Math.round(rgb[0] * RGB_BYTE_MAX);
  rgb[1] = Math.round(rgb[1] * RGB_BYTE_MAX);
  rgb[2] = Math.round(rgb[2] * RGB_BYTE_MAX);

  return rgb;
};

DYES.combineCMYDyesIntoRgbaPixel = function(dyeAmounts, globalMax) {
  if (!globalMax || globalMax <= 0) { return [...WHITE_RGBA]; }

  const cmykTotals = new Array(RGBA_CHANNELS).fill(0);
  for (var d = 0; d < this.length; d++) {
    for (var i = 0; i < RGB_CHANNELS; i++) {
      cmykTotals[i] = cmykTotals[i] + (dyeAmounts[d] * this[d].CMYKPattern[i]);
    }
  }

  const cmykScaled = cmykTotals.map(t => { return t / globalMax; });
  // Gamma correction: boost mid-tone concentrations toward full saturation
  const cmykGamma = cmykScaled.map(c => Math.pow(c, RENDERING_GAMMA));
  const cmykClippedToPercentage = cmykGamma.map(t => { return CMYK_PERCENTAGE_MAX * ((t > 1.0) ? 1.0 : t); });
  const rgba = DYES.CMYKtoRGB(cmykClippedToPercentage, FULL_OPACITY);
  return rgba;
};

DYES.writeGridOfDyeAmountsToImageData = function(grid, imageData, dyeSpace) {
  if ((imageData.width !== grid.length) || (imageData.height !== grid[0].length)) {
    throw new Error(`Error: mismatch found between size of grid and imageData`);
  }

  // First pass: find global maximum dye amount for adaptive scaling
  let globalMax = 0;
  for (var x = 0; x < imageData.width; x++) {
    for (var y = 0; y < imageData.height; y++) {
      for (var d = 0; d < this.length; d++) {
        if (grid[x][y][d] > globalMax) { globalMax = grid[x][y][d]; }
      }
    }
  }

  // Second pass: render with scaling
  const data = imageData.data;
  for (var x = 0; x < imageData.width; x++) {
    for (var y = 0; y < imageData.height; y++) {
      var dyeAmounts = grid[x][y];
      var rgba = (dyeSpace == 'cmyk') ? this.combineCMYDyesIntoRgbaPixel(dyeAmounts, globalMax) : this.combineDyesIntoRgbaPixel(dyeAmounts, globalMax);
      var dataCellIndex = RGBA_BYTES_PER_PIXEL * (x + (y * imageData.width));
      for (var i = 0; i < RGBA_CHANNELS; i++) {
        data[dataCellIndex + i] = rgba[i];
      }
    }
  }
  return imageData;
};
