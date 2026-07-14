// WCAG contrast of the palette. Colour is the one part of the design a reader can be
// excluded by, and the exclusion is silent — nobody files a bug saying "your muted text
// is 4.1:1". So the ratios that matter are asserted here rather than eyeballed.
//
// The pairs are the combinations the markup actually produces (global.css). A new pair
// in the CSS is not discovered automatically — add it below.
import { palettes } from '../src/lib/palette.ts';

const AA = 4.5; // normal-size text
const LARGE = 3; // >= 24px, or >= 18.66px bold

const PAIRS = [
  ['body text on the page', 'color-text', 'color-bg', AA],
  ['body text on a card', 'color-text', 'color-surface', AA],
  ['muted text on the page', 'color-muted', 'color-bg', AA],
  ['muted text on a card', 'color-muted', 'color-surface', AA],
  ['links on the page', 'color-accent', 'color-bg', AA],
  ['links on a card', 'color-accent', 'color-surface', AA],
  ['primary button label', 'color-accent-contrast', 'color-accent', AA],
  ['tag text', 'color-tag-text', 'color-tag-bg', AA],
  // Not text, so WCAG 1.4.11 governs: 3:1 for anything that identifies a control. A
  // button is told apart from the page by its outline alone, on both backgrounds. The
  // card border is deliberately absent — it decorates, it identifies nothing.
  ['button outline on the page', 'color-border-control', 'color-bg', LARGE],
  ['button outline on a card', 'color-border-control', 'color-surface', LARGE],
  // :focus-visible rings every focusable element, and plenty of them (project links,
  // buttons) sit on a card rather than on the page.
  ['focus ring on the page', 'color-accent', 'color-bg', LARGE],
  ['focus ring on a card', 'color-accent', 'color-surface', LARGE],
];

const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => channel(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = palettes();
const failures = [];

for (const [theme, colors] of Object.entries(themes)) {
  console.log(`\n  ${theme}`);
  for (const [label, fg, bg, min] of PAIRS) {
    const ratio = contrast(colors[fg], colors[bg]);
    const ok = ratio >= min;
    if (!ok) failures.push({ theme, label, ratio, min });
    console.log(
      `    ${ok ? '✓' : '✗'} ${label.padEnd(24)} ${ratio.toFixed(2).padStart(5)}:1 (needs ${min})`,
    );
  }
}

if (failures.length > 0) {
  console.error('\nContrast check failed:');
  for (const { theme, label, ratio, min } of failures) {
    console.error(`  - ${theme}: ${label} is ${ratio.toFixed(2)}:1, WCAG AA wants ${min}:1`);
  }
  process.exit(1);
}

console.log(`\nContrast OK (${PAIRS.length} pairs × ${Object.keys(themes).length} themes)\n`);
