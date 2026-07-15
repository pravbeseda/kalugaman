// Smoke check: the build succeeded, but did it actually produce a site?
// Guards against deploying an empty or half-built dist/.
//
// Project detail pages are derived from the content rather than listed here, so a new
// project is covered the day it is added.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { locales } from '../src/i18n/config.ts';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PROJECTS = new URL('../src/content/projects/', import.meta.url).pathname;

// The PDF resume is not built by `astro build` — it is a separate step (`npm run build:pdf`,
// which needs a browser), so it is only asserted where it was asked for: the deploy runs
// this check with --pdf, a PR build does not.
const withPdf = process.argv.includes('--pdf');

const ROUTES = ['', 'resume', 'projects', 'contacts'];

const expected = ['index.html', '404.html', 'sitemap-index.xml', 'robots.txt'];

for (const lang of locales) {
  for (const route of ROUTES) {
    expected.push(join(lang, route, 'index.html'));
  }

  // The share cards come out of the og-[lang].jpg endpoint during the build, so they
  // are worth asserting: a missing card means every shared link loses its preview.
  expected.push(`og-${lang}.jpg`);

  // The button on /resume links to this file unconditionally. Without it, the one thing a
  // recruiter came to download is a 404.
  if (withPdf) expected.push(join('cv', `cv-${lang}.pdf`));

  const slugs = readdirSync(join(PROJECTS, lang))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  for (const slug of slugs) {
    expected.push(join(lang, 'projects', slug, 'index.html'));
  }
}

// The PDF is only clean when Chromium runs with --font-render-hinting=none (see
// generate-pdf.mjs). Drop that flag, or land on a Chromium where it stops working, and
// FreeType on the Linux build host snaps every glyph advance to a whole pixel — the text
// still renders, so nothing else here would notice, but it renders with visibly uneven,
// "floating" letter-spacing. Chrome writes those advances as the horizontal offset in
// "<glyph> Tj  N 0 Td": hinting makes N an integer, unhinted layout leaves it fractional.
// So a page whose Td advances are essentially all whole numbers is the regression, and one
// with a healthy share of fractional advances is fine. macOS ignores the flag and always
// produces fractional advances, so this only ever fails on the Linux build that ships.
function pdfHintingError(path, file) {
  const buf = readFileSync(path);
  const advances = [];
  let i = 0;
  while (true) {
    const s = buf.indexOf('stream', i);
    if (s < 0) break;
    let start = s + 6;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    const end = buf.indexOf('endstream', start);
    if (end < 0) break;
    i = end + 9;

    const chunk = buf.subarray(start, end);
    if (chunk[0] !== 0x78) continue; // not a zlib (FlateDecode) stream
    let text;
    try {
      text = inflateSync(chunk).toString('latin1');
    } catch {
      continue;
    }
    // Text content streams are printable; skip inflated image data, whose bytes would
    // otherwise contribute stray " N 0 Td"-looking matches.
    const printable = text.replace(/[^\x20-\x7e]/g, '').length / text.length;
    if (printable < 0.6) continue;
    for (const m of text.matchAll(/(-?\d+(?:\.\d+)?)\s+0\s+Td/g)) advances.push(m[1]);
  }

  if (advances.length < 20) {
    return `${file}: could not read glyph advances — the hinting check cannot vouch for it`;
  }
  const fractional = advances.filter((n) => n.includes('.')).length;
  if (fractional / advances.length < 0.5) {
    return `${file}: glyph advances are snapped to whole pixels (${fractional}/${advances.length} fractional) — font hinting is back, letter-spacing will float`;
  }
  return null;
}

const errors = [];

for (const file of expected) {
  const path = join(DIST, file);
  if (!existsSync(path)) {
    errors.push(`missing ${file}`);
  } else if (statSync(path).size === 0) {
    errors.push(`empty ${file}`);
  }
}

const assets = join(DIST, '_astro');
if (!existsSync(assets) || readdirSync(assets).length === 0) {
  errors.push('_astro/ is missing or empty — pages would load without styles');
}

// Only worth reading a PDF that the loop above already confirmed is present and non-empty.
if (withPdf) {
  for (const lang of locales) {
    const file = join('cv', `cv-${lang}.pdf`);
    const path = join(DIST, file);
    if (existsSync(path) && statSync(path).size > 0) {
      const err = pdfHintingError(path, file);
      if (err) errors.push(err);
    }
  }
}

if (errors.length > 0) {
  console.error('dist/ smoke check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `dist/ smoke check OK (${expected.length} files, assets present${withPdf ? ', PDF included' : ''})`,
);
