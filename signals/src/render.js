// Draws TCP cards to PNG on the VPS, with the same drawing code the Card Studio page uses.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const createTCPCards = require('../../tools/card-studio/cards.cjs');

export const cards = createTCPCards({ Path2D });

// Family names must match the ones cards.cjs asks for (its F table).
const FONTS = [
  ['archivo-expanded-800.ttf', 'TCP Display'],
  ['archivo-400.ttf', 'Archivo'],
  ['instrument-serif-italic.ttf', 'Instrument Serif'],
  ['jetbrains-mono-500.ttf', 'JetBrains Mono'],
  ['jetbrains-mono-600.ttf', 'JetBrains Mono'],
];
let fontsLoaded = false;
function loadFonts() {
  if (fontsLoaded) return;
  for (const [file, family] of FONTS) {
    const ok = GlobalFonts.registerFromPath(path.join(here, '..', 'fonts', file), family);
    if (!ok) throw new Error(`could not load font ${file}`);
  }
  fontsLoaded = true;
}

function draw(size, fn) {
  loadFonts();
  const dims = cards.SIZES[size];
  if (!dims) throw new Error(`unknown card size "${size}"`);
  const [W, H] = dims;
  const canvas = createCanvas(W, H);
  fn(canvas.getContext('2d'), W, H);
  return canvas.toBuffer('image/png');
}

/** card: the Card Studio signal shape ({kind, instrument, side, entry, sl, tp, ...}). */
export function renderSignalCard(card, size = 'portrait') {
  return draw(size, (ctx, W, H) => cards.drawSignal(ctx, W, H, card, size));
}

/** results: {title, dates, trades: [{day, market, side, r}]} */
export function renderResultsCard(results, size = 'portrait') {
  return draw(size, (ctx, W, H) => cards.drawResults(ctx, W, H, results, size));
}
