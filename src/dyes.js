export const DYES = [
  {
    name: 'red',
      Rf: 0.8,
      Rd: 0.007,
      RGBPattern: [1.0, 0, 0],
      CMYKPattern: [100, 0, 0, 0],
  },
  {
    name: 'green',
      Rf: 0.85,
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

DYES.RGBMaximum = 253;

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

DYES.combineDyesIntoRgbaPixel = function(dyeAmounts) {
  var rgba01 = new Array(3).fill(0);

  for (var d = 0; d < this.length; d++) {
    for (var i = 0; i < 3; i++) {
      rgba01[i] = rgba01[i] + (dyeAmounts[d] * this[d].RGBPattern[i]);
    }
  }

  var maxRGB01 = Math.max.apply(null, rgba01);
  if (maxRGB01 > 1.0) {
    rgba01 = rgba01.map(c => { return c / maxRGB01; });
    maxRGB01 = 1.0;
  }
  rgba01.push(maxRGB01);
  if (maxRGB01 == 0) {
    rgba01.fill(1.0);
  }

  var rgba = rgba01.map(c => { return (c > 1.0) ? 255 : Math.floor(c * 255); });
  return rgba;
};

DYES.CMYKtoRGB = function(cmyk, a = 255) {
  var rgb = new Array(4).fill(0);
  rgb[3] = a;

  var c = cmyk[0] / 100;
  var m = cmyk[1] / 100;
  var y = cmyk[2] / 100;
  var k = cmyk[3] / 100;

  rgb[0] = 1 - Math.min(1, c * (1 - k) + k);
  rgb[1] = 1 - Math.min(1, m * (1 - k) + k);
  rgb[2] = 1 - Math.min(1, y * (1 - k) + k);

  rgb[0] = Math.round(rgb[0] * 255);
  rgb[1] = Math.round(rgb[1] * 255);
  rgb[2] = Math.round(rgb[2] * 255);

  return rgb;
};

DYES.combineCMYDyesIntoRgbaPixel = function(dyeAmounts) {
  const cmykTotals = new Array(4).fill(0);

  for (var d = 0; d < this.length; d++) {
    for (var i = 0; i < 3; i++) {
      cmykTotals[i] = cmykTotals[i] + (dyeAmounts[d] * this[d].CMYKPattern[i]);
    }
  }

  const cmykScaled = cmykTotals.map(t => { return t / 40; });
  const cmykClippedToPercentage = cmykScaled.map(t => { return 100 * ((t > 1.0) ? 1.0 : t); });
  const rgba = DYES.CMYKtoRGB(cmykClippedToPercentage, 255);
  return rgba;
};

DYES.writeGridOfDyeAmountsToImageData = function(grid, imageData, dyeSpace) {
  if ((imageData.width !== grid.length) || (imageData.height !== grid[0].length)) {
    throw new Error(`Error: mismatch found between size of grid and imageData`);
  }

  const data = imageData.data;
  for (var x = 0; x < imageData.width; x++) {
    for (var y = 0; y < imageData.height; y++) {
      var dyeAmounts = grid[x][y];
      var rgba = (dyeSpace == 'cmyk') ? this.combineCMYDyesIntoRgbaPixel(dyeAmounts) : this.combineDyesIntoRgbaPixel(dyeAmounts);
      var dataCellIndex = 4 * (x + (y * imageData.width));
      for (var i = 0; i < 4; i++) {
        data[dataCellIndex + i] = rgba[i];
      }
    }
  }
  return imageData;
};
