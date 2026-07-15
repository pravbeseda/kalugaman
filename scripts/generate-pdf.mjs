// The PDF resume, rendered from the resume page itself under print emulation — so the
// paper and the web CV are the one page, not two that can drift apart. The print styling
// (chrome hidden, sepia flattened to black on white) lives in the components' @media print.
//
// Not a step of `astro build`: that runs on every PR, and a PR has no use for a 150MB
// browser. `npm run build:pdf` runs after a build, locally on demand and on deploy.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { locales } from '../src/i18n/config.ts';
import { startPreview, stopPreview } from './lib/preview.mjs';

const PORT = 4325;
const OUT_DIR = 'dist/cv';

// The browser launch is inside the try: it can fail (an incompatible or missing browser),
// and if it did before the try, the finally that stops the preview would not be in force —
// leaving the detached server holding the port, the very leak the preview helper guards.
const { server, origin } = await startPreview({ port: PORT, readyPath: `/${locales[0]}/resume` });
let browser;

try {
  // --font-render-hinting=none is load-bearing, not cosmetic. With hinting on (the default on
  // Linux, where CI and deploy run), FreeType snaps each glyph's advance to a whole pixel, so
  // the PDF carries integer inter-letter offsets and every viewer renders visibly uneven,
  // "floating" spacing. macOS uses CoreText and ignores the flag, which is why the same script
  // produces clean, fractional advances locally and floating ones on CI. Disabling hinting
  // keeps advances fractional on every platform, so the paper matches what we see locally.
  browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
  await mkdir(OUT_DIR, { recursive: true });

  for (const lang of locales) {
    const page = await browser.newPage();
    const url = `${origin}/${lang}/resume`;
    // Print media before navigating, so the page lays out for paper from the first render
    // rather than being restyled after. printBackground keeps the accent rules and tags.
    await page.emulateMedia({ media: 'print' });
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    if (!res?.ok()) throw new Error(`${url} answered ${res?.status()}`);
    const path = `${OUT_DIR}/cv-${lang}.pdf`;
    await page.pdf({ path, format: 'A4', printBackground: true });

    console.log(`  ${path}`);
    await page.close();
  }
} finally {
  await browser?.close();
  stopPreview(server);
}

console.log(`\nPDF resume written to ${OUT_DIR}/ (${locales.join(', ')})\n`);
