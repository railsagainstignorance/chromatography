const ARBITRARY_MAX = 1000;

export const WORLD_DEFAULT_CONFIG = {
  EvaporationFromPaperRate: {
    value: 0.0005,
    range: [0, ARBITRARY_MAX],
    description: 'max amount of absorbed water which will evaporate from the paper',
  },
  EvaporationFromSurfaceRate: {
    value: 0.00005,
    range: [0, ARBITRARY_MAX],
    description: 'max amount of surface water which will evaoprate from the paper',
  },
  SpreadMinAmountToGoToDry: {
    value: 1,
    range: [0, ARBITRARY_MAX],
    description: "cell needs this min amount of surface water before spreading to a dry cell"
  },
  DownhillTipRatio: {
    value: 5,
    range: [1, ARBITRARY_MAX],
    description: "if there's a slope, the downhill SpreadMinAmountToGoToDry is multiplied by this factor"
  },
  DownhillTipRatioPartialDivisor: {
    value: Math.SQRT2,
    range: [1, ARBITRARY_MAX],
    description: "divide DownhillTipRatio by this factor for the corner nhrs"
  },
  ScaleForFlowToWet: {
    value: 1,
    range: [0, 2],
    description: "speed or slow the flow from wet to wet surface"
  },
  ScaleForFlowToDry: {
    value: 1,
    range: [0, 2],
    description: "speed or slow the flow from wet to dry surface"
  },
  PaperAbsorptionFactor: {
    value: 0.5,
    range: [0, 1],
    description: 'modify the water absorption rate across the whole paper'
  },
  PaperCapillaryFactor: {
    value: 1,
    range: [0, 1],
    description: 'modify the capillary flow rate across the whole paper'
  },
  PaperDiffusionFactor: {
    value: 0.15,
    range: [0, 1],
    description: 'modify the diffusion flow rate across the whole paper'
  },
  WaterDiffusionFactor: {
    value: 0.15,
    range: [0, 1],
    description: 'modify the diffusion flow rate across the whole paper surface'
  },
  Processes: {
    value: ['surfaceFlow', 'absorption', 'surfaceFlow', 'capillaryFlow', 'diffusion', 'evaporation', 'sanityCheckValue'],
    known: ['absorption', 'surfaceFlow', 'capillaryFlow', 'diffusion', 'evaporation', 'sanityCheckValue'],
    description: 'the sequence of physical processes to run in turn on the grid',
  },
  PaperSpotMaxWaterCapacityRange: {
    value: [0.9, 1.1],
    range: [0, ARBITRARY_MAX],
    type: 'range',
    description: "range of possible values for each PaperSpot's max water capacity (chosen at random when each spot is first created)",
  },
  PaperSpotWaterAbsorptionRateRange: {
    value: [0.09, 0.11],
    range: [0, ARBITRARY_MAX],
    type: 'range',
    description: "range of possible values for each PaperSpot's waterAbsorptionRate (chosen at random when each spot is first created)",
  },
  PaperSpotSpreadMinAmountToGoToDryFactorRange: {
    value: [0.5, 2],
    range: [0, ARBITRARY_MAX],
    type: 'range',
    description: "range of possible values for each PaperSpot's waterSpreadfactor, changing the threshold before water flows from this spot to a dry neighbour, as a factor of the paper default. 0 means no threshold, 1 means the paper default, >1 means more than the paper default (chosen at random when each spot is first created)",
  },
};

export const DEFAULT_CONFIG = {
  size: {
    value: 100,
    range: [1, ARBITRARY_MAX],
    description: 'dimensions of square canvas & grid',
  },
  maxIterations: {
    value: 1000,
    range: [0, 10 * ARBITRARY_MAX],
    description: 'upper limit for iteration, assuming there is still water in or on the paper',
  },
  displayEveryN: {
    value: 10,
    range: [1, 10 * ARBITRARY_MAX],
    description: 'only actually display the latest image every N iterations',
  },
  batchSize: {
    value: 10,
    range: [1, 10 * ARBITRARY_MAX],
    description: 'recalc the stats (for display on console) every N iterations',
  },
  record: {
    value: false,
    description: 'to record the canvas animation as a webm file',
  },
  dropsNum: {
    value: 5,
    range: [0, ARBITRARY_MAX],
    description: 'how many initial drops',
  },
  dropsXRange: {
    value: [0.3, 0.7],
    range: [0, 2],
    type: 'range',
    description: 'min/max of x as a proportion of world.width',
  },
  dropsYRange: {
    value: [0.2, 0.5],
    range: [0, 2],
    type: 'range',
    description: 'min/max of y as a proportion of world.width',
  },
  dropsRRange: {
    value: [0.02, 0.05],
    range: [0, 2],
    type: 'range',
    description: 'min/max of r as a proportion of the world.width (with an unbreakable minimum of 2 cells)',
  },
  dropsVRange: {
    value: [10, 30],
    range: [0, 10 * ARBITRARY_MAX],
    type: 'range',
    description: 'min/max of total droplet volume (divided among cells in the drop circle)',
  },
  dropsDRange: {
    value: [5, 10],
    range: [0, 10 * ARBITRARY_MAX],
    type: 'range',
    description: 'min/max of dilution of dyes in water in droplet. 0 means no dye in water, 1 means same amount of dye as water, > 1 means more dye than water.',
  },
  spotType: {
    value: 'cellSpot',
    known: ['cellSpot', 'waterSpot', 'paperSpot'],
    description: 'which source to use for dyeAmounts when generating the view',
  },
  viewType: {
    value: 'dyeAmounts',
    known: ['dyeAmounts', 'waterAmounts'],
    description: 'which type of source when generating the view',
  },
  dyeSpace: {
    value: 'rgb',
    known: ['cmyk', 'rgb'],
    description: 'which colour space to consider when combining the dyes',
  },
};

export function parseUrlParams(queryString, worldDefaultConfig = WORLD_DEFAULT_CONFIG, defaultConfig = DEFAULT_CONFIG) {
  const qsMinusQM = queryString.replace(/^\?/, '');
  const qsParamStrings = qsMinusQM.split(/&/);

  const configs = {};
  const history = {
    queryString: queryString,
    jsonList: [],
  };

  const candidateKeyValueMap = {};

  for (let paramString of qsParamStrings) {
    const match = paramString.match(/^([^=]+)=(.*)/);
    if (!match) {
      console.log(`parseUrlParams: could not parse ${paramString}`);
    } else {
      const name = match[1];
      const value = decodeURIComponent(match[2]);

      if (name == 'json') {
        const jsonObj = JSON.parse(value);
        Object.keys(jsonObj).forEach(k => {
          candidateKeyValueMap[k] = jsonObj[k];
        });
        history.jsonList.push(value);
      } else {
        candidateKeyValueMap[name] = value;
      }
    }
  }

  const CombinedDefaultConfig = Object.assign({}, defaultConfig, worldDefaultConfig);
  history['CombinedDefaultConfig'] = CombinedDefaultConfig;
  history['acceptedCandidateConfigs'] = {};

  for (let key of Object.keys(CombinedDefaultConfig)) {
    let value = CombinedDefaultConfig[key].value;
    if (candidateKeyValueMap.hasOwnProperty(key)) {
      const rawCandidateValue = candidateKeyValueMap[key];
      const decodedCandidateValue = decodeURIComponent(rawCandidateValue);
      const candidateValue = decodedCandidateValue.replace(/\+/g, ' ');
      const details = CombinedDefaultConfig[key];

      let defaultValuetype = typeof details.value;
      if (defaultValuetype === 'boolean') {
        value = (candidateValue == 'true');
      } else if (defaultValuetype === 'number') {
        const parsed = parseFloat(candidateValue);
        if (isNaN(parsed)) {
          console.log(`parseUrlParams: could not parse as a float: ${key}=${candidateValue}`);
        } else {
          if (details.range) {
            if (parsed < details.range[0] || parsed > details.range[1]) {
              console.log(`parseUrlParams: out of range, ${details.range}: ${key}=${candidateValue}`);
            } else {
              value = parsed;
            }
          }
        }
      } else if (Array.isArray(details.value)) {
        const parsed = JSON.parse(candidateValue);
        if (!Array.isArray(parsed)) {
          console.log(`parseUrlParams: not an array: ${key}=${candidateValue}`);
        } else {
          if (details.known) {
            const knownInNewValue = parsed.filter(v => { return details.known.includes(v); });
            if (knownInNewValue.length != parsed.length) {
              console.log(`parseUrlParams: contains unrecognised values, ${details.known}: ${key}=${candidateValue}`);
            } else {
              value = parsed;
            }
          } else if (details.type == 'range') {
            if (parsed.length != 2) {
              console.log(`parseUrlParams: should be a range consisting of two values: ${key}=${candidateValue}`);
            } else {
              const anyNaNs = parsed.filter(n => { return isNaN(n); });
              if (anyNaNs.length > 0) {
                console.log(`parseUrlParams: could not parse as two floats: ${key}=${candidateValue}`);
              } else if (parsed[0] > parsed[1]) {
                console.log(`parseUrlParams: floats should be in ascending order: ${key}=${candidateValue}`);
              } else if (details.range) {
                const anyOutOfRange = parsed.filter(n => {
                  return (n < details.range[0] || n > details.range[1]);
                });
                if (anyOutOfRange.length > 0) {
                  console.log(`parseUrlParams: floats should be in range, ${details.range}: ${key}=${candidateValue}`);
                } else {
                  value = parsed;
                }
              }
            }
          } else {
            value = parsed;
          }
        }
      } else if (details.known) {
        const candidateValueMinusSpeechmarks = candidateValue.replace(/^"(.*)"$/, '$1');
        if (!details.known.includes(candidateValueMinusSpeechmarks)) {
          console.log(`parseUrlParams: unrecognised value, ${details.known}: ${key}=${candidateValueMinusSpeechmarks}`);
        } else {
          value = candidateValueMinusSpeechmarks;
        }
      }

      if (value != CombinedDefaultConfig[key].value) {
        history['acceptedCandidateConfigs'][key] = candidateValue;
      }
    }
    configs[key] = value;
  }

  const unrecognisedKeys = Object.keys(candidateKeyValueMap).filter(k => { return !CombinedDefaultConfig.hasOwnProperty(k); });
  if (unrecognisedKeys.length > 0) {
    console.log(`parseUrlParams: contains unrecognised keys: ${unrecognisedKeys}`);
  }

  configs['history'] = history;

  return configs;
}
