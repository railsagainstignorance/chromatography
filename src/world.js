import { DYES } from './dyes.js';
import { WaterSpot } from './water-spot.js';
import { CellSpot } from './cell-spot.js';
import { WORLD_DEFAULT_CONFIG } from './config.js';
import { randomWithinRange } from './utils.js';

// CAWorld and CellAutoCell are expected as globals (loaded via script tag in browser,
// or set up in test/setup.js for vitest).

export function setupCAWorldExtensions() {
  CAWorld.DefaultConfig = WORLD_DEFAULT_CONFIG;
  CAWorld.ARBITRARY_MAX = 1000;

  CAWorld.prototype.addDroplets = function(spotsWithCoords) {
    for (var spot of spotsWithCoords) {
      var cell = this.grid[spot.y][spot.x];
      if (!cell) {
        console.log(`DEBUG: CAWorld.prototype.addDroplets: spot.x=${spot.x}, spot.y=${spot.y}, this.height=${this.height}, this.width=${this.width}`);
      }
      var cellSpot = cell.next;
      cellSpot.addDroplet(spot.droplet);
      this.waterDropletsAddedToSurface.addDroplet(spot.droplet);
      this.SurfaceWaterAmount = this.SurfaceWaterAmount + spot.droplet.waterAmount;
    }
  };

  CAWorld.prototype.addBigDrop = function(centreX, centreY, r, v, d) {
    const fromX = Math.floor(Math.max(centreX - r, 0));
    const toX = Math.floor(Math.min(centreX + r, this.height - 1));
    const fromY = Math.floor(Math.max(centreY - r, 0));
    const toY = Math.floor(Math.min(centreY + r, this.width - 1));

    const spotsWithCoords = [];

    for (var x = fromX; x <= toX; x++) {
      for (var y = fromY; y <= toY; y++) {
        const dx = x - centreX;
        const dy = y - centreY;

        if ((dx * dx + dy * dy) <= r * r) {
          spotsWithCoords.push({ x: x, y: y });
        }
      }
    }

    const droplet = WaterSpot.createBigRandomDrop(v, d);

    spotsWithCoords.forEach(swc => {
      swc.droplet = droplet.clone();
    });

    this.addDroplets(spotsWithCoords);
  };

  CAWorld.prototype.stepWithCount = function() {
    if (!this.stepCount) { this.stepCount = 0; }
    this.stepCount = this.stepCount + 1;
    this.stepThroughAllProcesses();
  };

  CAWorld.prototype.resetGrid = function() {
    let surfaceWaterAmount = 0;
    let grid = this.grid;
    let y, x;
    for (y = 0; y < this.height; y++) {
      for (x = 0; x < this.width; x++) {
        grid[y][x].reset();
        surfaceWaterAmount = surfaceWaterAmount + grid[x][y].value.waterSpot.waterAmount;
      }
    }

    this.SurfaceWaterAmount = surfaceWaterAmount;
  };

  CAWorld.prototype.addProcessTiming = function(name, timing) {
    if (!this.processTimings.hasOwnProperty(name)) {
      this.processTimings[name] = [];
    }

    this.processTimings[name].push(timing);
  };

  var neighborhood = [null, null, null, null, null, null, null, null];

  CAWorld.prototype.stepThroughProcess = function(processName) {
    const skipBecauseSurfaceDry = (
      this.SurfaceWaterAmount <= 0
      &&
      this.processesInvolvingOnlySurfaceWater.includes(processName)
    );

    if (!skipBecauseSurfaceDry) {
      const startGridMillis = Date.now();
      this.resetGrid();
      const endGridMillis = Date.now();
      this.addProcessTiming('resetGrid', endGridMillis - startGridMillis);
    }
    {
      const startProcessMillis = Date.now();
      if (!skipBecauseSurfaceDry) {
        for (var y = this.height - 1; y >= 0; y--) {
          for (var x = this.width - 1; x >= 0; x--) {
            this.fillNeighbors(neighborhood, x, y);
            var cell = this.grid[y][x];
            cell[processName](neighborhood);

            for (var i = 0; i < cell.delays.length; i++) {
              cell.delays[i].steps--;
              if (cell.delays[i].steps <= 0) {
                cell.delays[i].action(cell);
                cell.delays.splice(i, 1);
                i--;
              }
            }
          }
        }
      }

      const endProcessMillis = Date.now();
      this.addProcessTiming(processName, endProcessMillis - startProcessMillis);
    }
  };

  CAWorld.prototype.stepThroughAllProcesses = function() {
    this.Processes.forEach(name => {
      this.stepThroughProcess(name);
    });
  };

  CAWorld.prototype.importConfig = function(config) {
    this.config = {};

    for (let key of Object.keys(CAWorld.DefaultConfig)) {
      const details = CAWorld.DefaultConfig[key];
      if (details.hasOwnProperty('value')) {
        let value = details.value;

        if (config != undefined && config.hasOwnProperty(key)) {
          value = config[key];
        }

        this.config[key] = value;
        this[key] = value;
      }
    }

    console.log(`world configs=${JSON.stringify(this.config, null, " ")}`);
  };
}

export function createWorldOfBlottingPaperAndDyes(width, height, config = {}) {
  var world = new CAWorld({
    width: Math.floor(width),
    height: Math.floor(height),
  });

  world.directions = [world.LEFT, world.RIGHT, world.BOTTOM, world.TOP, world.TOPLEFT, world.TOPRIGHT, world.BOTTOMLEFT, world.BOTTOMRIGHT];
  world.waterSpotLost = new WaterSpot();
  world.waterEvaporationFromPaper = new WaterSpot();
  world.waterEvaporationFromSurface = new WaterSpot();
  world.waterDropletsAddedToSurface = new WaterSpot();

  world.processTimings = {};

  world.processesInvolvingOnlySurfaceWater = ['absorption', 'surfaceFlow'];

  world.importConfig(config);

  world.registerCellType('paper', {
    getCellValue: function() {
      return this.value;
    },
    getCellNextValue: function() {
      return this.next;
    },
    sanityCheckValue: function() {
      const thisValueWaterSpot = this.value.waterSpot;
      const thisValuePaperSpot = this.value.paperSpot;

      function thisError(msg) {
        throw new Error(`ERROR: (${this.x}, ${this.y}): ${msg}`);
      }
      if (thisValuePaperSpot.waterAmount < 0) { thisError(`thisValuePaperSpot.waterAmount < 0, ${thisValuePaperSpot.waterAmount}`); }
      if (thisValueWaterSpot.waterAmount < 0) { thisError(`thisValueWaterSpot.waterAmount < 0, ${thisValueWaterSpot.waterAmount}`); }
      for (var d = 0; d < DYES.length; d++) {
        if (thisValuePaperSpot.dyeAmounts[d] < 0) { thisError(`thisValuePaperSpot.dyeAmounts[${d}]<0, ${thisValuePaperSpot.dyeAmounts[d]}`); }
        if (thisValueWaterSpot.dyeAmounts[d] < 0) { thisError(`thisValueWaterSpot.dyeAmounts[${d}]<0, ${thisValueWaterSpot.dyeAmounts[d]}`); }
      }
    },
    absorption: function(_neighbors) {
      const thisNextWaterSpot = this.next.waterSpot;
      const thisNextPaperSpot = this.next.paperSpot;
      const thisValueWaterSpot = this.value.waterSpot;
      const thisValuePaperSpot = this.value.paperSpot;

      if (thisValueWaterSpot.waterAmount > 0) {
        const remainingPaperWaterCapacity = thisValuePaperSpot.MaxWaterCapacity - thisValuePaperSpot.waterAmount;
        if (remainingPaperWaterCapacity > 0) {
          const waterAmountToBeAbsorbed = Math.min(thisValueWaterSpot.waterAmount, thisValuePaperSpot.WaterAbsorptionRate, remainingPaperWaterCapacity) * world.PaperAbsorptionFactor;
          const proportionWaterAmountToBeAbsorbed = (waterAmountToBeAbsorbed / thisValueWaterSpot.waterAmount);
          thisNextPaperSpot.waterAmount = thisNextPaperSpot.waterAmount + waterAmountToBeAbsorbed;
          thisNextWaterSpot.waterAmount = thisNextWaterSpot.waterAmount - waterAmountToBeAbsorbed;

          for (var d = 0; d < DYES.length; d++) {
            const flowProportion = (proportionWaterAmountToBeAbsorbed == 1) ? 1 : proportionWaterAmountToBeAbsorbed * DYES[d].Rf;
            const flowAmount = flowProportion * thisValueWaterSpot.dyeAmounts[d];
            thisNextPaperSpot.dyeAmounts[d] = thisNextPaperSpot.dyeAmounts[d] + flowAmount;
            thisNextWaterSpot.dyeAmounts[d] = thisNextWaterSpot.dyeAmounts[d] - flowAmount;
          }
        }
      }

      return true;
    },
    surfaceFlow: function(neighbors) {
      const thisNextWaterSpot = this.next.waterSpot;
      const thisValueWaterSpot = this.value.waterSpot;

      function flowWithNhbr(direction, downhillTipRatio) {
        const nhbr = neighbors[direction.index];
        let nhbrValueWaterSpot;
        let nhbrValueWaterSpotWaterAmount = 0;
        if (nhbr) {
          nhbrValueWaterSpot = nhbr.value.waterSpot;
          nhbrValueWaterSpotWaterAmount = nhbrValueWaterSpot.waterAmount;
        }
        if ((thisValueWaterSpot.waterAmount == 0) && (nhbrValueWaterSpotWaterAmount == 0)) {
          return;
        }

        if (thisValueWaterSpot.waterAmount == 0) {
          if (nhbrValueWaterSpotWaterAmount <= (nhbrValueWaterSpot.SpreadMinAmountToGoToDryFactor * world.SpreadMinAmountToGoToDry * downhillTipRatio)) {
            return;
          }
        } else if (nhbrValueWaterSpotWaterAmount == 0) {
          if (thisValueWaterSpot.waterAmount <= (thisValueWaterSpot.SpreadMinAmountToGoToDryFactor * world.SpreadMinAmountToGoToDry / downhillTipRatio)) {
            return;
          }
        }

        const totalAmounts = thisValueWaterSpot.waterAmount + nhbrValueWaterSpotWaterAmount;
        const nhbrTargetAmount = totalAmounts * 1 / (downhillTipRatio + 1);
        const nhbrWaterDelta = nhbrTargetAmount - nhbrValueWaterSpotWaterAmount;

        const scaleForFlowToWetOrDry = (thisValueWaterSpot.waterAmount > 0 && nhbrValueWaterSpotWaterAmount > 0) ? world.ScaleForFlowToWet : world.ScaleForFlowToDry;
        const waterAmountFlowing = nhbrWaterDelta * scaleForFlowToWetOrDry / 8;

        if (waterAmountFlowing == 0) {
          return;
        } else if (waterAmountFlowing > 0) {
          const proportionWaterAmountFlowing = waterAmountFlowing / thisValueWaterSpot.waterAmount;
          thisNextWaterSpot.waterAmount = thisNextWaterSpot.waterAmount - waterAmountFlowing;
          if (!nhbr) { world.waterSpotLost.waterAmount = world.waterSpotLost.waterAmount + waterAmountFlowing; }

          for (var d = 0; d < DYES.length; d++) {
            const dyeAmountFlowing = thisValueWaterSpot.dyeAmounts[d] * proportionWaterAmountFlowing;
            thisNextWaterSpot.dyeAmounts[d] = thisNextWaterSpot.dyeAmounts[d] - dyeAmountFlowing;
            if (!nhbr) { world.waterSpotLost.dyeAmounts[d] = world.waterSpotLost.dyeAmounts[d] + dyeAmountFlowing; }
          }
        } else {
          const waterAmountFlowingFromNhbr = -waterAmountFlowing;
          thisNextWaterSpot.waterAmount = thisNextWaterSpot.waterAmount + waterAmountFlowingFromNhbr;
          const proportionWaterAmountFlowing = waterAmountFlowingFromNhbr / nhbrValueWaterSpotWaterAmount;
          for (var d = 0; d < DYES.length; d++) {
            const dyeAmountFlowing = nhbrValueWaterSpot.dyeAmounts[d] * proportionWaterAmountFlowing;
            thisNextWaterSpot.dyeAmounts[d] = thisNextWaterSpot.dyeAmounts[d] + dyeAmountFlowing;
          }
        }
      }

      const DownhillTipRatioPartial = world.DownhillTipRatio / world.DownhillTipRatioPartialDivisor;

      flowWithNhbr(world.LEFT, 1);
      flowWithNhbr(world.RIGHT, 1);
      flowWithNhbr(world.TOP, world.DownhillTipRatio);
      flowWithNhbr(world.TOPLEFT, DownhillTipRatioPartial);
      flowWithNhbr(world.TOPRIGHT, DownhillTipRatioPartial);
      flowWithNhbr(world.BOTTOM, 1 / world.DownhillTipRatio);
      flowWithNhbr(world.BOTTOMLEFT, 1 / DownhillTipRatioPartial);
      flowWithNhbr(world.BOTTOMRIGHT, 1 / DownhillTipRatioPartial);

      return true;
    },
    capillaryFlow: function(neighbors) {
      const thisNextPaperSpot = this.next.paperSpot;
      const thisValuePaperSpot = this.value.paperSpot;

      const remainingPaperWaterCapacity = thisValuePaperSpot.MaxWaterCapacity - thisValuePaperSpot.waterAmount;
      for (var direction of world.directions) {
        let nhbr = neighbors[direction.index];
        if (!nhbr) { continue; }
        let nhbrValuePaperSpot = nhbr.value.paperSpot;
        let deltaWaterAmount = (thisValuePaperSpot.waterAmount - nhbrValuePaperSpot.waterAmount);
        let deltaWaterAmountScaled = deltaWaterAmount / (2 * 8);
        if (remainingPaperWaterCapacity > 0 && deltaWaterAmountScaled < 0) {
          let waterFlowAmount = Math.min((-deltaWaterAmountScaled), remainingPaperWaterCapacity) * world.PaperCapillaryFactor;
          thisNextPaperSpot.waterAmount = thisNextPaperSpot.waterAmount + waterFlowAmount;
          let waterFlowProportion = waterFlowAmount / nhbrValuePaperSpot.waterAmount;
          for (var d = 0; d < DYES.length; d++) {
            let dyeFlowAmount = waterFlowProportion * DYES[d].Rf * nhbrValuePaperSpot.dyeAmounts[d];
            thisNextPaperSpot.dyeAmounts[d] = thisNextPaperSpot.dyeAmounts[d] + dyeFlowAmount;
          }
        } else if (deltaWaterAmountScaled > 0) {
          let nhbrRemainingPaperWaterCapacity = nhbrValuePaperSpot.MaxWaterCapacity - nhbrValuePaperSpot.waterAmount;
          if (nhbrRemainingPaperWaterCapacity > 0) {
            let waterFlowAmount = Math.min(deltaWaterAmountScaled, nhbrRemainingPaperWaterCapacity) * world.PaperCapillaryFactor;
            thisNextPaperSpot.waterAmount = thisNextPaperSpot.waterAmount - waterFlowAmount;
            let waterFlowProportion = waterFlowAmount / thisValuePaperSpot.waterAmount;
            for (var d = 0; d < DYES.length; d++) {
              let dyeFlowAmount = waterFlowProportion * DYES[d].Rf * thisValuePaperSpot.dyeAmounts[d];
              thisNextPaperSpot.dyeAmounts[d] = thisNextPaperSpot.dyeAmounts[d] - dyeFlowAmount;
            }
          }
        }
      }

      return true;
    },
    diffusion: function(neighbors) {
      for (let params of [
        ['paperSpot', world.PaperDiffusionFactor],
        ['waterSpot', world.WaterDiffusionFactor]
      ]) {

        const spotType = params[0];
        const diffusionFactor = params[1];

        if (diffusionFactor <= 0) { continue; }

        const thisValueSpot = this.value[spotType];
        const thisNextSpot = this.next[spotType];

        if (thisValueSpot.waterAmount > 0) {
          for (var direction of world.directions) {
            let nhbr = neighbors[direction.index];
            if (!nhbr) { continue; }
            let nhbrValueSpot = nhbr.value[spotType];
            if (nhbrValueSpot.waterAmount <= 0) { continue; }

            for (var d = 0; d < DYES.length; d++) {
              let thisValueConcentration = thisValueSpot.dyeAmounts[d] / thisValueSpot.waterAmount;
              let nhbrValueConcentration = nhbrValueSpot.dyeAmounts[d] / nhbrValueSpot.waterAmount;
              let deltaConcentration = nhbrValueConcentration - thisValueConcentration;
              if (deltaConcentration > 0) {
                let dyeFlowAmount = diffusionFactor * DYES[d].Rd * (deltaConcentration / nhbrValueConcentration) * nhbrValueSpot.dyeAmounts[d] / 8;
                thisNextSpot.dyeAmounts[d] = thisNextSpot.dyeAmounts[d] + dyeFlowAmount;
              } else if (deltaConcentration < 0) {
                let dyeFlowAmount = diffusionFactor * DYES[d].Rd * (deltaConcentration / thisValueConcentration) * thisValueSpot.dyeAmounts[d] / 8;
                thisNextSpot.dyeAmounts[d] = thisNextSpot.dyeAmounts[d] + dyeFlowAmount;
              }
            }
          }
        }
      }

      return true;
    },
    evaporation: function(_neighbors) {
      const thisNextWaterSpot = this.next.waterSpot;
      const thisNextPaperSpot = this.next.paperSpot;
      const thisValueWaterSpot = this.value.waterSpot;
      const thisValuePaperSpot = this.value.paperSpot;

      if (thisValueWaterSpot.waterAmount > 0) {
        let evapAmount = Math.min(thisValueWaterSpot.waterAmount, world.EvaporationFromSurfaceRate);
        if (evapAmount > 0) {
          thisNextWaterSpot.waterAmount = thisNextWaterSpot.waterAmount - evapAmount;
          world.waterEvaporationFromSurface.waterAmount = world.waterEvaporationFromSurface.waterAmount + evapAmount;
          if (thisNextWaterSpot.waterAmount == 0) {
            thisNextPaperSpot.addDroplet(thisNextWaterSpot);
            thisNextWaterSpot.dyeAmounts.fill(0);
          }
        }
      }
      else if (thisValuePaperSpot.waterAmount > 0) {
        let evapAmount = Math.min(thisValuePaperSpot.waterAmount, world.EvaporationFromPaperRate);
        thisNextPaperSpot.waterAmount = thisNextPaperSpot.waterAmount - evapAmount;
        world.waterEvaporationFromPaper.waterAmount = world.waterEvaporationFromPaper.waterAmount + evapAmount;
      }

      return true;
    },
    reset: function() {
      let oldPrev = this.prev;
      this.prev = this.value;
      this.value = this.next;
      this.next = oldPrev;
      this.next.copy(this.value);
      return true;
    }
  }, function(x, y) {
    const spotConfig = {
      MaxWaterCapacity: randomWithinRange(world.PaperSpotMaxWaterCapacityRange),
      WaterAbsorptionRate: randomWithinRange(world.PaperSpotWaterAbsorptionRateRange),
      SpreadMinAmountToGoToDryFactor: randomWithinRange(world.PaperSpotSpreadMinAmountToGoToDryFactorRange),
    };
    this.value = new CellSpot(null, 0, spotConfig);
    this.prev = this.value.clone();
    this.next = this.value.clone();
    this.x = x;
    this.y = y;
  });

  world.initialize([
    { name: 'paper', distribution: 100 }
  ]);

  return world;
}
