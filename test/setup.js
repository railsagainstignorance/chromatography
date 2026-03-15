import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const CellAuto = require('../assets/cellauto.min.js');

globalThis.CAWorld = CellAuto.World;
globalThis.CellAutoCell = CellAuto.Cell;
