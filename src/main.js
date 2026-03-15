import { DYES } from './dyes.js';
import { parseUrlParams } from './config.js';
import { setupCAWorldExtensions, createWorldOfBlottingPaperAndDyes } from './world.js';
import { displayWorld } from './rendering.js';
import { randomWithinRange } from './utils.js';

setupCAWorldExtensions();

function calcDyeAndWaterTotalsInWorld(world) {
  const worldGrid = world.grid;
  const dyeAmountsInPaper = DYES.newEmptyDyeAmounts();
  const dyeAmountsInWater = DYES.newEmptyDyeAmounts();
  let waterAmountInPaper = 0;
  let waterAmountOnSurface = 0;

  for (var x = 0; x < world.width; x++) {
    for (var y = 0; y < world.height; y++) {
      let cell = worldGrid[y][x].getCellNextValue();
      DYES.addAmounts(cell.paperSpot.dyeAmounts, dyeAmountsInPaper);
      DYES.addAmounts(cell.waterSpot.dyeAmounts, dyeAmountsInWater);
      waterAmountInPaper = waterAmountInPaper + cell.paperSpot.waterAmount;
      waterAmountOnSurface = waterAmountOnSurface + cell.waterSpot.waterAmount;
    }
  }

  const dyeAmountsTotal = DYES.newEmptyDyeAmounts();
  DYES.addAmounts(dyeAmountsInPaper, dyeAmountsTotal);
  DYES.addAmounts(dyeAmountsInWater, dyeAmountsTotal);
  DYES.addAmounts(world.waterSpotLost.dyeAmounts, dyeAmountsTotal);
  DYES.addAmounts(world.paperSpotLost.dyeAmounts, dyeAmountsTotal);
  DYES.subtractAmounts(world.waterDropletsAddedToSurface.dyeAmounts, dyeAmountsTotal);
  const dyeAmountTotal = dyeAmountsTotal.reduce((prev, curr) => prev + curr);
  const waterAmountTotal = [
    waterAmountInPaper,
    waterAmountOnSurface,
    world.waterSpotLost.waterAmount,
    world.paperSpotLost.waterAmount,
    world.waterEvaporationFromPaper.waterAmount,
    world.waterEvaporationFromSurface.waterAmount
  ].reduce((prev, curr) => prev + curr) - world.waterDropletsAddedToSurface.waterAmount;

  return {
    waterAmountTotal: waterAmountTotal,
    waterAmountInPaper: waterAmountInPaper,
    waterAmountOnSurface: waterAmountOnSurface,
    waterAmountInPaperOrOnSurface: waterAmountInPaper + waterAmountOnSurface,
    waterAmountLost: world.waterSpotLost.waterAmount,
    waterAmountEvaporationFromPaper: world.waterEvaporationFromPaper.waterAmount,
    waterAmountEvaporationFromSurface: world.waterEvaporationFromSurface.waterAmount,
    waterDropletsAddedToSurface: world.waterDropletsAddedToSurface.waterAmount,
    dyeAmountTotal: dyeAmountTotal,
    dyeAmountsTotal: dyeAmountsTotal,
    dyeAmountsInPaper: dyeAmountsInPaper,
    dyeAmountsInWater: dyeAmountsInWater,
    dyeAmountsLost: world.waterSpotLost.dyeAmounts,
    stepCount: (world.stepCount === undefined) ? 0 : world.stepCount,
  };
}

function calcDyeAndWaterTotalDelta(totalsList, relative = true) {
  const first = (relative) ? totalsList[totalsList.length - 2] : totalsList[0];
  const last = totalsList[totalsList.length - 1];
  return {
    stepCountDelta: last.stepCount - first.stepCount + ((relative) ? 0 : 1),
    waterAmountTotal: (last.waterAmountTotal - first.waterAmountTotal).toFixed(5),
    dyeAmountTotal: (last.dyeAmountTotal - first.dyeAmountTotal).toFixed(5),
  };
}

function calcAndDisplayTotals(world, iterationDetails, relative = true) {
  let fromTimeMillis = iterationDetails.startBatchRunTimeMillis;
  let fromIndex = (relative && iterationDetails.totalsList.length > 2) ? iterationDetails.totalsList.length - 2 : 0;

  let nowMillis = Date.now();
  let frameRate = iterationDetails.batchSize / ((nowMillis - fromTimeMillis) / 1000);
  let pixelRate = iterationDetails.batchSize * world.width * world.height / ((nowMillis - iterationDetails.startBatchRunTimeMillis) / 1000);
  let totals = calcDyeAndWaterTotalsInWorld(world);
  iterationDetails.totalsList.push(totals);
  if (iterationDetails.totalsList.length > 1) {
    const totalsDelta = calcDyeAndWaterTotalDelta(iterationDetails.totalsList, relative);
    if (Math.abs(totalsDelta.waterAmountTotal) > iterationDetails.minAcceptableDelta || Math.abs(totalsDelta.dyeAmountTotal) > iterationDetails.minAcceptableDelta) {
      console.log(`WARNING: delta error > ${iterationDetails.minAcceptableDelta}
        prev: ${JSON.stringify(iterationDetails.totalsList[fromIndex])}
        last: ${JSON.stringify(iterationDetails.totalsList[iterationDetails.totalsList.length - 1])}`);
      console.log(`       totalsDelta=${JSON.stringify(totalsDelta)}`);
    }
    if (relative) {
      iterationDetails.startBatchRunTimeMillis = nowMillis;
    }
  }
  console.log(`iteration=${iterationDetails.numIterations}, frames/s=${frameRate.toFixed(2)}, pixels/s=${pixelRate.toFixed(0)}, waterAmountRemaining=${totals.waterAmountInPaperOrOnSurface.toFixed(1)} (on surface: ${totals.waterAmountOnSurface.toFixed(1)})`);

  {
    const names = Object.keys(world.processTimings);

    const processTimings = names.map(name => {
      const timingsList = world.processTimings[name];
      const lastFew = timingsList.slice(-iterationDetails.batchSize);
      const avg = lastFew.reduce((prev, curr) => prev + curr) / lastFew.length;
      return `${name}: ${avg.toFixed(0)}`;
    });

    console.log(`process timings: ${processTimings.join(', ')}`);
  }
}

function addDrops(world, details) {
  for (var i = 0; i < details.num; i++) {
    world.addBigDrop(
      randomWithinRange(details.xRange),
      randomWithinRange(details.yRange),
      randomWithinRange(details.rRange),
      randomWithinRange(details.vRange),
      randomWithinRange(details.dRange)
    );
  }
}

function startRecording(canvas, codeVersion) {
  const mimeType = 'video/webm';
  const options = { mimeType: mimeType };
  const recordedFile = `chromatography-experiment.${codeVersion}.webm`;
  function download(event) {
    const videoData = [event.data];
    const blob = new Blob(videoData, {
      type: mimeType
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none';
    a.href = url;
    a.download = recordedFile;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  const frameRate = 15;
  const stream = canvas.captureStream(frameRate);
  const mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.ondataavailable = download;
  mediaRecorder.start();
  window.addEventListener('StopRecording', _e => { mediaRecorder.stop(); });
}

function formOnSubmitFn(form) {
  for (var tr of form.firstChild.childNodes) {
    const input = tr.childNodes[1].firstChild;
    if (input.type == 'text') {
      if (input.value == "") {
        input.disabled = true;
      }
    }
  }
  return true;
}

function writeParamsToForm(configs, formElt) {
  formElt.innerHTML = "";
  formElt.onsubmit = function(_e) { return formOnSubmitFn(formElt); };
  const tableElt = document.createElement("table");
  const combinedDefaultConfig = configs.history.CombinedDefaultConfig;
  for (var name of Object.keys(combinedDefaultConfig)) {
    const details = combinedDefaultConfig[name];

    const trElt = document.createElement("tr");
    const tdElt = document.createElement("td");
    tdElt.textContent = name;
    trElt.appendChild(tdElt);
    const tdElt2 = document.createElement("td");
    const inputElt = document.createElement("input");
    inputElt.type = "text";
    inputElt.name = name;
    if (configs.history.acceptedCandidateConfigs.hasOwnProperty(name)) { inputElt.value = configs.history.acceptedCandidateConfigs[name]; }
    tdElt2.appendChild(inputElt);
    trElt.appendChild(tdElt2);
    const tdElt3 = document.createElement("td");
    tdElt3.appendChild(document.createTextNode("default: " + JSON.stringify(details.value, null, " ")));
    tdElt3.appendChild(document.createElement("br"));
    if (details.known) {
      tdElt3.appendChild(document.createTextNode("known: " + JSON.stringify(details.known, null, " ")));
      tdElt3.appendChild(document.createElement("br"));
    }
    if (details.type == 'range') {
      tdElt3.appendChild(document.createTextNode("type==range: " + JSON.stringify(details.range)));
      tdElt3.appendChild(document.createElement("br"));
    } else if (details.range) {
      tdElt3.appendChild(document.createTextNode("range: " + JSON.stringify(details.range)));
      tdElt3.appendChild(document.createElement("br"));
    }
    tdElt3.appendChild(document.createTextNode(combinedDefaultConfig[name].description));
    trElt.appendChild(tdElt3);
    tableElt.appendChild(trElt);
  }
  formElt.appendChild(tableElt);
  const submitElt = document.createElement('input');
  submitElt.type = 'submit';
  submitElt.value = 'Submit';
  formElt.appendChild(submitElt);
}

export function createPaper(canvas, queryString) {
  const configs = parseUrlParams(queryString);
  console.log(`all configs: ${JSON.stringify(configs, null, ' ')}`);
  if (configs['size'] && configs['size'] > 1) {
    canvas.setAttribute('height', configs['size']);
    canvas.setAttribute('width', configs['size']);
  }

  if (configs.record) { startRecording(canvas, '3-0'); }

  function createPaperAddDropsAndRun() {
    const context = canvas.getContext('2d');
    console.log(`canvas.width=${canvas.width}, canvas.height=${canvas.height}`);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const world = createWorldOfBlottingPaperAndDyes(imageData.width, imageData.height, configs);

    const iterationDetails = {
      numIterations: 1,
      maxIterations: configs.maxIterations,
      batchSize: configs['batchSize'],
      startOverallRunTimeMillis: Date.now(),
      startBatchRunTimeMillis: Date.now(),
      minAcceptableDelta: 0.1,
      totalsList: [calcDyeAndWaterTotalsInWorld(world)],
    };

    console.log(`iteration=0,`);

    function iterateAndDisplayWorld() {
      world.stepWithCount();

      if (iterationDetails.numIterations % configs['displayEveryN'] == 1) {
        displayWorld(configs, world, imageData, context);
      }

      const relative = true;

      if ((iterationDetails.numIterations % iterationDetails.batchSize == 0) || iterationDetails.numIterations == 1) {
        calcAndDisplayTotals(world, iterationDetails, relative);
      }

      iterationDetails.numIterations = iterationDetails.numIterations + 1;
      const lastTotals = iterationDetails.totalsList[iterationDetails.totalsList.length - 1];
      const waterRemaining = lastTotals.waterAmountInPaper + lastTotals.waterAmountOnSurface;
      if ((iterationDetails.numIterations >= iterationDetails.maxIterations)
        || ((iterationDetails.numIterations > iterationDetails.batchSize) && (waterRemaining <= 0))
      ) {
        displayWorld(configs, world, imageData, context);
        calcAndDisplayTotals(world, iterationDetails, !relative);
        console.log(`iterations ended.`);
        window.dispatchEvent(new Event('StopRecording'));
      } else {
        window.requestAnimationFrame(iterateAndDisplayWorld);
      }
    }

    addDrops(world, {
      num: configs.dropsNum,
      xRange: configs.dropsXRange.map(n => { return n * world.width; }),
      yRange: configs.dropsYRange.map(n => { return n * world.height; }),
      rRange: configs.dropsRRange.map(n => { return n * world.width; }),
      vRange: configs.dropsVRange,
      dRange: configs.dropsDRange
    });

    iterateAndDisplayWorld();
  }

  return {
    run: createPaperAddDropsAndRun,
    writeParamsToForm: function(inputDiv) { writeParamsToForm(configs, inputDiv); },
  };
}

// Expose globally for the inline script in index.html
window.Chroma = { createPaper };
