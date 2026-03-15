import { describe, it, expect } from 'vitest';
import { parseUrlParams, DEFAULT_CONFIG, WORLD_DEFAULT_CONFIG, PRESETS, buildQueryString } from '../src/config.js';

describe('parseUrlParams', () => {
  it('returns default values for empty query string', () => {
    const configs = parseUrlParams('');
    expect(configs.size).toBe(100);
    expect(configs.maxIterations).toBe(1000);
    expect(configs.dyeSpace).toBe('rgb');
  });

  it('parses numeric parameters', () => {
    const configs = parseUrlParams('?size=40');
    expect(configs.size).toBe(40);
  });

  it('parses string parameters with known values', () => {
    const configs = parseUrlParams('?dyeSpace=rgb');
    expect(configs.dyeSpace).toBe('rgb');
  });

  it('rejects unknown string values', () => {
    const configs = parseUrlParams('?dyeSpace=hsl');
    expect(configs.dyeSpace).toBe('rgb'); // falls back to default
  });

  it('parses boolean parameters', () => {
    const configs = parseUrlParams('?record=true');
    expect(configs.record).toBe(true);
  });

  it('parses range array parameters', () => {
    const configs = parseUrlParams('?dropsXRange=[0.1,0.9]');
    expect(configs.dropsXRange).toEqual([0.1, 0.9]);
  });

  it('rejects out-of-range numeric values', () => {
    const configs = parseUrlParams('?size=5000');
    expect(configs.size).toBe(100); // falls back to default (max is 1000)
  });

  it('parses json parameter', () => {
    const json = encodeURIComponent(JSON.stringify({ size: 50, dropsNum: 5 }));
    const configs = parseUrlParams(`?json=${json}`);
    expect(configs.size).toBe(50);
    expect(configs.dropsNum).toBe(5);
  });

  it('handles multiple parameters', () => {
    const configs = parseUrlParams('?size=40&dropsNum=5&dyeSpace=rgb');
    expect(configs.size).toBe(40);
    expect(configs.dropsNum).toBe(5);
    expect(configs.dyeSpace).toBe('rgb');
  });

  it('parses WaterSourceEnabled boolean', () => {
    const configs = parseUrlParams('?WaterSourceEnabled=true');
    expect(configs.WaterSourceEnabled).toBe(true);
  });

  it('defaults WaterSourceEnabled to false', () => {
    const configs = parseUrlParams('');
    expect(configs.WaterSourceEnabled).toBe(false);
  });

  it('parses WaterSourceYRange', () => {
    const configs = parseUrlParams('?WaterSourceYRange=[0,0.1]');
    expect(configs.WaterSourceYRange).toEqual([0, 0.1]);
  });

  it('rejects out-of-range WaterSourceYRange values', () => {
    const configs = parseUrlParams('?WaterSourceYRange=[0,1.5]');
    expect(configs.WaterSourceYRange).toEqual([0, 0.05]); // falls back to default
  });

  it('includes history with accepted overrides', () => {
    const configs = parseUrlParams('?size=40');
    expect(configs.history).toBeDefined();
    expect(configs.history.acceptedCandidateConfigs.size).toBe('40');
  });
});

describe('buildQueryString', () => {
  it('builds a query string from simple params', () => {
    const qs = buildQueryString({ size: 40, record: true });
    expect(qs).toBe('?size=40&record=true');
  });

  it('JSON-encodes array values', () => {
    const qs = buildQueryString({ dropsXRange: [0.3, 0.7] });
    expect(qs).toBe(`?dropsXRange=${encodeURIComponent('[0.3,0.7]')}`);
  });

  it('round-trips through parseUrlParams', () => {
    for (const preset of PRESETS) {
      const qs = buildQueryString(preset.params);
      const configs = parseUrlParams(qs);
      for (const [key, value] of Object.entries(preset.params)) {
        expect(configs[key]).toEqual(value);
      }
    }
  });
});
