import {exportPaths, browserArgs, isolatePage, saveNewFile} from './security.mjs';
// Export an HTML deck to PPTX via per-slide screenshots.
// Usage: node export-pptx.mjs <input.html> [output.pptx] [--jpeg 0.85]

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , inputArg, outputArg, ...flags] = process.argv;

if (!inputArg) {
  console.error('Usage: node export-pptx.mjs <input.html> [output.pptx] [--jpeg 0.85]');
  process.exit(1);
}

const jpegIdx = flags.indexOf('--jpeg');
const jpegQuality = jpegIdx >= 0 && flags[jpegIdx + 1] ? parseFloat(flags[jpegIdx + 1]) : null;
const useJpeg = jpegQuality !== null;

const validated=exportPaths(inputArg, outputArg, '.pptx');
const inputAbs=validated.source;
const output=validated.destination;
const tmp = mkdtempSync(path.join(tmpdir(), 'pptx-'));

console.log(`input: ${inputAbs}`);
console.log(`output: ${output}`);

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.error('puppeteer not installed. run: npm install -D puppeteer');
  process.exit(1);
}

let pptxgen;
try {
  pptxgen = (await import('pptxgenjs')).default;
} catch {
  console.error('pptxgenjs not installed. run: npm install -D pptxgenjs');
  process.exit(1);
}

const browser = await puppeteer.launch({ args: browserArgs, ...(process.env.DESIGN_CHROME_PATH ? {executablePath:process.env.DESIGN_CHROME_PATH} : {}) });
try {
const page = await browser.newPage();
await isolatePage(page, validated.root);
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(inputAbs).toString(), { waitUntil: 'networkidle0' });

// Wait for deck-stage to be ready (raise timeout for heavy decks)
await page.waitForFunction(() => {
  const d = document.querySelector('deck-stage');
  return d && typeof d.totalSlides === 'number' && d.totalSlides > 0;
}, { timeout: 30000 });

// Wait for fonts too
await page.evaluate(async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
});

const total = await page.evaluate(() => document.querySelector('deck-stage').totalSlides);
// Use public getters (attribute fallback kept for robustness)
const dims = await page.evaluate(() => {
  const d = document.querySelector('deck-stage');
  const w = (typeof d.width === 'number' && d.width)
    || parseInt(d.getAttribute('width'), 10) || 1920;
  const h = (typeof d.height === 'number' && d.height)
    || parseInt(d.getAttribute('height'), 10) || 1080;
  return { w, h };
});
console.log(`found ${total} slides at ${dims.w}×${dims.h}`);

const notes = await page.evaluate(() => {
  const el = document.getElementById('speaker-notes');
  if (!el) return [];
  try { return JSON.parse(el.textContent); } catch { return []; }
});

const pres = new pptxgen();
pres.defineLayout({ name: 'DECK', width: 13.333, height: 7.5 });
pres.layout = 'DECK';

for (let i = 0; i < total; i++) {
  await page.evaluate((idx) => {
    const d = document.querySelector('deck-stage');
    d.setAttribute('noscale', '');
    d.goToSlide(idx);
  }, i);
  // Wait for any in-slide requestAnimationFrame + network idle
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await new Promise((r) => setTimeout(r, 200));

  const ext = useJpeg ? 'jpg' : 'png';
  const imgPath = path.join(tmp, `slide-${String(i).padStart(3, '0')}.${ext}`);
  await page.screenshot({
    path: imgPath,
    type: useJpeg ? 'jpeg' : 'png',
    ...(useJpeg ? { quality: Math.round(jpegQuality * 100) } : {}),
    clip: { x: 0, y: 0, width: dims.w, height: dims.h },
  });

  const slide = pres.addSlide();
  slide.background = { path: imgPath };
  if (notes[i]) slide.addNotes(String(notes[i]));

  process.stdout.write(`\rslide ${i + 1}/${total}`);
}

console.log('');

saveNewFile(output, await pres.write({outputType:'nodebuffer'}));

const stat = await import('node:fs/promises').then((m) => m.stat(output));
console.log(`wrote ${output} (${(stat.size / 1024).toFixed(1)} KB)`);
} finally { await browser.close(); }
