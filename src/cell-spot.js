import { PaperSpot } from './paper-spot.js';
import { WaterSpot } from './water-spot.js';

export function CellSpot(paperSpot, waterSpot, spotConfigs = {}) {
  this.paperSpot = (paperSpot) ? paperSpot.clone() : new PaperSpot(null, 0, spotConfigs);
  this.waterSpot = (waterSpot) ? waterSpot.clone() : new WaterSpot(0, null, spotConfigs);
  this.spotConfigs = spotConfigs;
}

CellSpot.prototype = (function() {
  return {
    clone: function() { return new CellSpot(this.paperSpot, this.waterSpot, this.spotConfigs); },
    addDroplet: function(drop) { this.waterSpot.addDroplet(drop); },
    stringify: function() { return JSON.stringify(this); },
    copy: function(from) {
      this.paperSpot.copy(from.paperSpot);
      this.waterSpot.copy(from.waterSpot);
    },
  };
})();
