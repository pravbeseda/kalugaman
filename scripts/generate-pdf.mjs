// The PDF resume, rendered from the resume page itself under print emulation — so the
// paper and the web CV are the one page, not two that can drift apart. The print styling
// (chrome hidden, sepia flattened to black on white) lives in the components' @media print.
//
// Not a step of `astro build`: that runs on every PR, and a PR has no use for a 150MB
// browser. `npm run build:pdf` runs after a build, locally on demand and on deploy.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { locales } from '../src/i18n/config.ts';

const OUT_DIR = 'dist/cv';
// A hint, not a promise: astro preview takes the next free port when this one is busy, so
// the port the browser is pointed at is read back from the server, never assumed.
const PORT_HINT = 4325;

// The astro binary directly, not `npx astro`: npx spawns astro as a child, and a signal to
// npx is not guaranteed to reach that child — a preview would outlive this script and keep
// holding its port, which is exactly what would then confuse the next run about which
// server is answering. detached puts astro at the head of its own process group so the
// cleanup can sweep the whole tree.
const ASTRO = new URL('../node_modules/.bin/astro', import.meta.url).pathname;

/** Serve the built site, and resolve with the origin the server actually bound to. */
function startPreview() {
  const server = spawn(ASTRO, ['preview', '--port', String(PORT_HINT)], {
    stdio: ['ignore', 'pipe', 'inherit'],
    detached: true,
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop(server);
      reject(new Error('astro preview printed no URL within 30s'));
    }, 30_000);

    let out = '';
    server.stdout.on('data', (chunk) => {
      out += chunk;
      // The port astro chose, from its own mouth — the one guard against rendering a PDF of
      // whatever else happened to be sitting on the hinted port.
      const match = out.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve({ server, origin: `http://localhost:${match[1]}` });
      }
    });

    server.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`astro preview exited with code ${code} before serving`));
    });
  });
}

/** Kill the whole process group, not just the leader — so nothing is left holding the port. */
function stop(server) {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // already gone
  }
}

const { server, origin } = await startPreview();
const browser = await chromium.launch();

try {
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
  await browser.close();
  stop(server);
}

console.log(`\nPDF resume written to ${OUT_DIR}/ (${locales.join(', ')})\n`);
