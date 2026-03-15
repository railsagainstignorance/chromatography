export function randomWithinRange(range) {
  return range[0] + (range[1] - range[0]) * Math.random();
}

export function getMaxOfArray(numArray) {
  return Math.max.apply(null, numArray);
}
