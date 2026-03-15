# Changelog

All notable changes to the chromatography simulation.

## [Unreleased]

### Developer experience

- Add `.env` for port configuration (`PORT=8000`, `PORT_TEST=8001`), gitignored with `.env.example` checked in
- Add `npm start` and `npm run start:test` scripts that read ports from `.env`

### Model veracity improvements

- **Absorbing boundaries** — capillaryFlow and diffusion now allow water/dye to flow out at grid edges (tracked via `world.paperSpotLost`), eliminating the thick rim artefact caused by asymmetric boundary conditions
- **Diagonal distance correction** — all flow processes (surfaceFlow, capillaryFlow, diffusion) weight diagonal neighbors by 1/√2 relative to orthogonal ones, replacing the hard-coded `/8` divisor with distance-based `direction.weight / world.fullTotalWeight`
- **Adaptive color scaling** — rendering now finds the global max dye amount per frame and scales all color values relative to it, replacing the arbitrary CMYK `/40` divisor and the RGB alpha-as-intensity approach
- **White-to-color mapping** — RGB mode now uses full opacity (alpha=255) and lerps from white to the dye color, so dilute dyes appear as light tints rather than becoming transparent
- **Fix droplet distribution** — `addBigDrop` divides the droplet's water and dye amounts by the number of cells in the circle, so total volume is conserved; default `dropsVRange` increased from `[0.1, 10]` to `[10, 500]` to compensate

### Physics integration tests

- Conservation tests for all individual processes (absorption, surfaceFlow, capillaryFlow, diffusion, evaporation) and full-step runs (1 and 10 iterations)
- Boundary behaviour test asserting edge cells no longer accumulate more dye than interior cells
- Fix `importConfig` to correctly apply defaults when no config is passed

### Codebase restructuring

- Extract monolithic `index.html` (1400+ lines) into ES modules under `src/`:
  - `dyes.js` — DYES array, dye amount operations, RGB and CMYK color conversion
  - `paper-spot.js` — PaperSpot class (absorbed water in paper)
  - `water-spot.js` — WaterSpot class (surface water carrying dyes)
  - `cell-spot.js` — CellSpot class (combines PaperSpot + WaterSpot per cell)
  - `world.js` — CAWorld extensions, physics processes, world creation
  - `config.js` — WORLD_DEFAULT_CONFIG, DEFAULT_CONFIG, parseUrlParams
  - `rendering.js` — grid-to-canvas rendering pipeline
  - `utils.js` — randomWithinRange, getMaxOfArray
  - `main.js` — entry point, wires everything together
- `index.html` reduced to a thin HTML shell loading `cellauto.min.js` + `src/main.js`
- Add vitest test suite (65 tests) covering dyes, spots, config parsing, utils, world, and physics
- Add ESLint with `eslint.config.mjs`
