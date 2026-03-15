#!/usr/bin/env node
/**
 * Screenshot Capture Tool — Capture simulation UI for visual inspection.
 *
 * Two capture modes:
 *   1. Completion detection (default): waits for console.log('iterations ended.')
 *   2. Fixed wait (--wait N): captures after N milliseconds
 *
 * Usage:
 *   # Capture after simulation completes
 *   npm run screenshot -- default
 *
 *   # Capture mid-simulation at 3s
 *   npm run screenshot -- default --wait 3000
 *
 *   # Capture all registered pages
 *   npm run screenshot -- --all
 *
 *   # Custom viewport
 *   npm run screenshot -- default --width 1200 --height 1200
 *
 *   # Execute JS before capture
 *   npm run screenshot -- default --js "document.title"
 *
 *   # Capture a specific CSS selector
 *   npm run screenshot -- default --selector "canvas"
 *
 *   # URL parameter substitution
 *   npm run screenshot -- default --param size=80
 *
 *   # List all registered pages
 *   npm run screenshot -- --list
 *
 * Prerequisites:
 *   npm install (installs playwright + js-yaml as devDependencies)
 *   npx playwright install chromium   # one-time browser download
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const REGISTRY_PATH = join(__dirname, 'pages.yml');
const OUTPUT_DIR = join(PROJECT_ROOT, 'agent_work', 'screenshots');

// =========================================================================
// Constants
// =========================================================================

const COMPLETION_MESSAGE = 'iterations ended.';
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 800;
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_PORT = 8001;
const SERVER_CHECK_TIMEOUT = 2000;

// =========================================================================
// Port loading
// =========================================================================

function loadPort() {
  const envPath = join(PROJECT_ROOT, '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('PORT_TEST=')) {
        const val = parseInt(trimmed.split('=')[1], 10);
        if (!isNaN(val)) return val;
      }
    }
  }
  return DEFAULT_PORT;
}

const SERVER_PORT = loadPort();
const BASE_URL = `http://localhost:${SERVER_PORT}`;

// =========================================================================
// YAML loading (via js-yaml)
// =========================================================================

function loadYaml(filePath) {
  const require = createRequire(import.meta.url);
  const yaml = require('js-yaml');
  const content = readFileSync(filePath, 'utf-8');
  return yaml.load(content);
}

// =========================================================================
// Registry
// =========================================================================

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(`ERROR: Registry not found: ${REGISTRY_PATH}`);
    process.exit(1);
  }
  return loadYaml(REGISTRY_PATH);
}

function listPages(registry) {
  const defaults = registry.defaults || {};
  const pages = registry.pages || {};
  const keys = Object.keys(pages);

  const separator = '='.repeat(70);
  console.log(separator);
  console.log(`Registered Pages  (base: ${BASE_URL})`);
  console.log(separator);

  for (const [key, spec] of Object.entries(pages)) {
    const path = spec.path;
    const desc = spec.description || '';
    const hasParams = path.includes('{');
    const marker = hasParams ? '  [needs --param]' : '';

    console.log(`\n  ${key}${marker}`);
    console.log(`    ${path}`);
    console.log(`    ${desc}`);

    for (const field of ['width', 'height', 'timeout']) {
      if (spec[field] !== undefined && spec[field] !== defaults[field]) {
        console.log(`    ${field}: ${spec[field]}`);
      }
    }
    if (spec.note) {
      console.log(`    note: ${spec.note}`);
    }
  }

  console.log(`\n${separator}`);
  console.log(`  ${keys.length} pages registered`);
  console.log(`  Defaults: ${defaults.width || DEFAULT_WIDTH}x${defaults.height || DEFAULT_HEIGHT}, ` +
    `timeout ${defaults.timeout || DEFAULT_TIMEOUT}ms`);
  console.log(`  Capture modes: completion detection (default) or --wait N`);
  console.log(`  Output:   ${OUTPUT_DIR}/`);
  console.log(separator);
}

// =========================================================================
// Server check
// =========================================================================

async function checkServer() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_CHECK_TIMEOUT);
    const resp = await fetch(BASE_URL, { signal: controller.signal });
    clearTimeout(timer);
    return resp.status < 500;
  } catch {
    return false;
  }
}

// =========================================================================
// Path resolution
// =========================================================================

function resolvePath(pathTemplate, params) {
  const placeholders = [...pathTemplate.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  if (placeholders.length === 0) return pathTemplate;

  const missing = placeholders.filter(p => !(p in params));
  if (missing.length > 0) {
    console.error(`ERROR: Missing path parameters: ${missing.join(', ')}`);
    console.error(`  Use: --param ${missing[0]}=value`);
    process.exit(1);
  }

  let result = pathTemplate;
  for (const key of placeholders) {
    result = result.replace(`{${key}}`, params[key]);
  }
  return result;
}

function hasPathParams(path) {
  return /\{\w+\}/.test(path);
}

// =========================================================================
// Output path
// =========================================================================

function makeOutputPath(pageKey) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  return join(OUTPUT_DIR, `${pageKey}_${ts}.png`);
}

// =========================================================================
// Capture
// =========================================================================

async function capturePage(browser, pageKey, pageSpec, defaults, overrides = {}) {
  const params = overrides.params || {};
  const path = resolvePath(pageSpec.path, params);
  const url = BASE_URL + path;
  const outputPath = makeOutputPath(pageKey);

  const width = overrides.width || pageSpec.width || defaults.width || DEFAULT_WIDTH;
  const height = overrides.height || pageSpec.height || defaults.height || DEFAULT_HEIGHT;
  const timeout = overrides.timeout || pageSpec.timeout || defaults.timeout || DEFAULT_TIMEOUT;
  const waitMs = overrides.wait;  // undefined means use completion detection
  const javascript = overrides.javascript || pageSpec.javascript;
  const selector = overrides.selector || pageSpec.selector;

  const context = await browser.newContext({
    viewport: { width, height },
  });
  const page = await context.newPage();

  try {
    if (waitMs !== undefined) {
      // Fixed wait mode: navigate, wait N ms, then capture
      await page.goto(url, { waitUntil: 'load' });

      if (javascript) {
        await page.evaluate(javascript);
      }

      await page.waitForTimeout(waitMs);
    } else {
      // Completion detection mode: wait for 'iterations ended.' console message
      const completionPromise = page.waitForEvent('console', {
        predicate: msg => msg.text() === COMPLETION_MESSAGE,
        timeout,
      });

      await page.goto(url, { waitUntil: 'load' });

      if (javascript) {
        await page.evaluate(javascript);
      }

      await completionPromise;
    }

    // Capture
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        console.error(`  ${pageKey}: ERROR — selector "${selector}" not found`);
        return null;
      }
      await element.screenshot({ path: outputPath });
    } else {
      await page.screenshot({ path: outputPath });
    }

    const mode = waitMs !== undefined ? `waited ${waitMs}ms` : 'completion detected';
    console.log(`  ${pageKey}: ${outputPath}  (${mode})`);
    return outputPath;
  } catch (err) {
    if (err.message.includes('Timeout')) {
      console.error(`  ${pageKey}: ERROR — timed out after ${timeout}ms waiting for simulation to complete`);
      console.error(`    Tip: use --wait N for a fixed delay instead`);
    } else {
      console.error(`  ${pageKey}: ERROR — ${err.message}`);
    }
    return null;
  } finally {
    await context.close();
  }
}

// =========================================================================
// Param parsing
// =========================================================================

function parseParams(paramList) {
  if (!paramList || paramList.length === 0) return {};
  const params = {};
  for (const p of paramList) {
    if (!p.includes('=')) {
      console.error(`ERROR: Invalid param format '${p}', expected key=value`);
      process.exit(1);
    }
    const [key, ...rest] = p.split('=');
    params[key] = rest.join('=');
  }
  return params;
}

// =========================================================================
// CLI
// =========================================================================

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      all: { type: 'boolean', default: false },
      list: { type: 'boolean', default: false },
      width: { type: 'string' },
      height: { type: 'string' },
      wait: { type: 'string' },
      timeout: { type: 'string' },
      js: { type: 'string' },
      selector: { type: 'string' },
      param: { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(`Usage: npm run screenshot -- [page_key] [options]

Options:
  --list              List all registered pages
  --all               Capture all registered pages
  --width N           Viewport width (default: ${DEFAULT_WIDTH})
  --height N          Viewport height (default: ${DEFAULT_HEIGHT})
  --wait N            Fixed wait in ms (overrides completion detection)
  --timeout N         Max wait for completion in ms (default: ${DEFAULT_TIMEOUT})
  --js "code"         JavaScript to execute after page load
  --selector "css"    Capture specific CSS selector
  --param key=value   URL parameter substitution (repeatable)
  -h, --help          Show this help`);
    return;
  }

  const registry = loadRegistry();
  const defaults = registry.defaults || {};
  const pages = registry.pages || {};

  // --list
  if (values.list) {
    listPages(registry);
    return;
  }

  const pageKey = positionals[0];

  if (!pageKey && !values.all) {
    console.error('ERROR: Specify a page key or use --all');
    console.error('  Run with --list to see available pages');
    process.exit(1);
  }

  // Pre-flight: check server
  const serverUp = await checkServer();
  if (!serverUp) {
    console.error(`ERROR: Server not responding on ${BASE_URL}`);
    console.error(`  Start with: npm run start:test`);
    process.exit(1);
  }

  // Pre-flight: check playwright
  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch {
    console.error('ERROR: playwright not found. Run:');
    console.error('  npm install');
    console.error('  npx playwright install chromium');
    process.exit(1);
  }

  const params = parseParams(values.param);
  const overrides = {
    width: values.width ? parseInt(values.width, 10) : undefined,
    height: values.height ? parseInt(values.height, 10) : undefined,
    wait: values.wait ? parseInt(values.wait, 10) : undefined,
    timeout: values.timeout ? parseInt(values.timeout, 10) : undefined,
    javascript: values.js,
    selector: values.selector,
    params,
  };

  const browser = await chromium.launch();

  try {
    if (values.all) {
      // Capture all pages
      const captured = [];
      const skipped = [];
      for (const [key, spec] of Object.entries(pages)) {
        if (hasPathParams(spec.path)) {
          skipped.push(key);
          continue;
        }
        const result = await capturePage(browser, key, spec, defaults, overrides);
        if (result) captured.push(result);
      }
      console.log(`\nCaptured ${captured.length} pages`);
      if (skipped.length > 0) {
        console.log(`Skipped ${skipped.length} (need --param): ${skipped.join(', ')}`);
      }
    } else {
      // Single page
      if (!(pageKey in pages)) {
        console.error(`ERROR: Unknown page '${pageKey}'`);
        console.error('  Run with --list to see available pages');
        await browser.close();
        process.exit(1);
      }
      await capturePage(browser, pageKey, pages[pageKey], defaults, overrides);
    }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
});
