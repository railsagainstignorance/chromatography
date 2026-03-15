import { DYES } from './dyes.js';

export function PaperSpot(dyeAmounts, waterAmount = 0, configs = {}) {
  this.dyeAmounts = (dyeAmounts) ? dyeAmounts.slice(0) : DYES.newEmptyDyeAmounts();
  this.waterAmount = waterAmount;
  this._configs = configs;
  for (var c of Object.keys(this._defaultConfigs)) {
    this[c] = (configs.hasOwnProperty(c)) ? configs[c] : this._defaultConfigs[c];
  }
}

PaperSpot.prototype = (function() {
  let _defaultConfigs = {
    MaxWaterCapacity: 1,
    WaterAbsorptionRate: 0.1,
  };
  return {
    _defaultConfigs: _defaultConfigs,
    clone: function() { return new PaperSpot(this.dyeAmounts, this.waterAmount, this._configs); },
    stringify: function() { return JSON.stringify(this); },
    copy: function(from) {
      this.waterAmount = from.waterAmount;
      DYES.copyAmounts(from.dyeAmounts, this.dyeAmounts);
    },
    addDroplet: function(drop) {
      this.waterAmount = Math.min(this.waterAmount + drop.waterAmount, this.MaxWaterCapacity);
      for (var i = 0; i < this.dyeAmounts.length; i++) {
        this.dyeAmounts[i] = this.dyeAmounts[i] + drop.dyeAmounts[i];
      }
      return this;
    },
  };
})();
