import { DYES } from './dyes.js';

export function writeWorldWaterAmountsToImageData(world, imageData) {
  var worldGrid = world.grid;
  if ((imageData.width !== worldGrid.length) || (imageData.height !== worldGrid[0].length)) {
    throw new Error(`Error: mismatch found between size of grid and imageData`);
  }
  const data = imageData.data;
  for (var x = 0; x < imageData.width; x++) {
    for (var y = 0; y < imageData.height; y++) {
      const cellValue = worldGrid[y][x].getCellValue();
      var rgba = [
        (cellValue.waterSpot.waterAmount) * 255,
        (cellValue.paperSpot.waterAmount) * 255,
        0,
        255
      ];
      var dataCellIndex = 4 * (x + (y * imageData.width));
      for (var i = 0; i < 4; i++) {
        data[dataCellIndex + i] = rgba[i];
      }
    }
  }
  return imageData;
}

export function convertWorldGridToGridOfDyeAmounts(world, spotType = 'paperSpot') {
  var worldGrid = world.grid;
  var gridOfDyeAmounts = [];

  for (var x = 0; x < world.width; x++) {
    var col = [];
    gridOfDyeAmounts.push(col);
    for (var y = 0; y < world.height; y++) {
      const cellValue = worldGrid[y][x].getCellValue();
      let dyeAmounts;
      if (spotType == 'paperSpot' || spotType == 'waterSpot') {
        dyeAmounts = cellValue[spotType].dyeAmounts;
      } else {
        dyeAmounts = DYES.cloneAmounts(cellValue.paperSpot.dyeAmounts);
        DYES.addAmounts(cellValue.waterSpot.dyeAmounts, dyeAmounts);
      }
      col.push(dyeAmounts);
    }
  }

  return gridOfDyeAmounts;
}

export function displayWorld(configs, world, imageData, context) {
  const startDisplayMillis = Date.now();
  if (configs['viewType'] == 'dyeAmounts') {
    let gridOfDyeAmounts = convertWorldGridToGridOfDyeAmounts(world, configs['spotType']);
    DYES.writeGridOfDyeAmountsToImageData(gridOfDyeAmounts, imageData, configs['dyeSpace']);
  } else if (configs['viewType'] == 'waterAmounts') {
    writeWorldWaterAmountsToImageData(world, imageData);
  }
  context.putImageData(imageData, 0, 0);
  const endDisplayMillis = Date.now();
  world.addProcessTiming('gridToImageData', endDisplayMillis - startDisplayMillis);
}
