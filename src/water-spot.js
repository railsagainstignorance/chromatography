import { DYES } from './dyes.js';

export function WaterSpot(waterAmount, dyeAmounts, configs = {}) {
  this.waterAmount = (waterAmount) ? waterAmount : 0;
  this.dyeAmounts = (dyeAmounts) ? dyeAmounts.slice(0) : DYES.newEmptyDyeAmounts();
  this._configs = configs;
  for (var c of Object.keys(this._defaultConfigs)) {
    this[c] = (configs.hasOwnProperty(c)) ? configs[c] : this._defaultConfigs[c];
  }
}

WaterSpot.prototype = (function() {
  let _defaultConfigs = {
    SpreadMinAmountToGoToDryFactor: 1,
  };

  return {
    _defaultConfigs: _defaultConfigs,
    clone: function() { return new WaterSpot(this.waterAmount, this.dyeAmounts, this._configs); },
    addDroplet: function(drop) {
      this.waterAmount = this.waterAmount + drop.waterAmount;
      for (var i = 0; i < this.dyeAmounts.length; i++) {
        this.dyeAmounts[i] = this.dyeAmounts[i] + drop.dyeAmounts[i];
      }
      return this;
    },
    divideBy: function(n) {
      this.waterAmount = this.waterAmount / n;
      for (var i = 0; i < this.dyeAmounts.length; i++) {
        this.dyeAmounts[i] = this.dyeAmounts[i] / n;
      }
      return this;
    },
    stringify: function() { return JSON.stringify(this); },
    copy: function(from) {
      this.waterAmount = from.waterAmount;
      DYES.copyAmounts(from.dyeAmounts, this.dyeAmounts);
    },
  };
})();

WaterSpot.createBigRedDrop = function() {
  const waterAmount = 1000.0;
  const dyeAmounts = DYES.newEmptyDyeAmounts();
  dyeAmounts[0] = 3000.0;
  const drop = new WaterSpot(waterAmount, dyeAmounts);
  return drop;
};

WaterSpot.createBigRandomDrop = function(volume = 1, dilution = 1) {
  const waterAmount = volume;
  const dyeAmounts = DYES.newEmptyDyeAmounts();
  for (var i = 0; i < dyeAmounts.length; i++) {
    dyeAmounts[i] = volume * Math.random() * dilution;
  }
  const drop = new WaterSpot(waterAmount, dyeAmounts);
  return drop;
};
