import { describe, it, expect } from 'vitest';
import { parseUrlParams, DEFAULT_CONFIG, WORLD_DEFAULT_CONFIG } from '../src/config.js';

describe('parseUrlParams', () => {
  it('returns default values for empty query string', () => {
    const configs = parseUrlParams('');
    expect(configs.size).toBe(100);
    expect(configs.maxIterations).toBe(2000);
    expect(configs.dyeSpace).toBe('cmyk');
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
    expect(configs.dyeSpace).toBe('cmyk'); // falls back to default
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

  it('includes history with accepted overrides', () => {
    const configs = parseUrlParams('?size=40');
    expect(configs.history).toBeDefined();
    expect(configs.history.acceptedCandidateConfigs.size).toBe('40');
  });
});
