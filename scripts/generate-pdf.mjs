// The PDF resume, rendered from the print pages the build already produced — so the paper
// and the web CV cannot say different things: both are the `resume` collection.
//
// Not a step of `astro build`: that runs on every PR, and a PR has no use for a 150MB
// browser. `npm run build:pdf` runs after a build, locally on demand and on deploy.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { locales } from '../src/i18n/config.ts';

const PORT = 4325;
const ORIGIN = `http://localhost:${PORT}`;
const OUT_DIR = 'dist/cv';

/** The built site, served as the browser will meet it — fonts and all. */
async function startPreview() {
  const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`astro preview exited with code ${server.exitCode}`);
    }
    try {
      const res = await fetch(`${ORIGIN}/${locales[0]}/resume/print`);
      if (res.ok) return server;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  server.kill();
  throw new Error(`astro preview did not answer on ${ORIGIN} within 30s`);
}

const server = await startPreview();
const browser = await chromium.launch();

try {
  await mkdir(OUT_DIR, { recursive: true });

  for (const lang of locales) {
    const page = await browser.newPage();
    const url = `${ORIGIN}/${lang}/resume/print`;
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    if (!res?.ok()) throw new Error(`${url} answered ${res?.status()}`);

    // The print page is styled for paper, not for a screen that happens to be printed —
    // so the emulation is print, and the backgrounds (the accent rules) are kept.
    await page.emulateMedia({ media: 'print' });
    const path = `${OUT_DIR}/cv-${lang}.pdf`;
    await page.pdf({ path, format: 'A4', printBackground: true });

    console.log(`  ${path}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(`\nPDF resume written to ${OUT_DIR}/ (${locales.join(', ')})\n`);
