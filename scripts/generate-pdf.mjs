// The PDF resume, rendered from the resume page itself under print emulation — so the
// paper and the web CV are the one page, not two that can drift apart. The print styling
// (chrome hidden, sepia flattened to black on white) lives in the components' @media print.
//
// Not a step of `astro build`: that runs on every PR, and a PR has no use for a 150MB
// browser. `npm run build:pdf` runs after a build, locally on demand and on deploy.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { locales } from '../src/i18n/config.ts';

const HOST = '127.0.0.1';
const PORT = 4325;
const ORIGIN = `http://${HOST}:${PORT}`;
const OUT_DIR = 'dist/cv';

// The astro binary directly, not `npx astro`: npx spawns astro as a child, and a signal to
// npx is not guaranteed to reach that child — a preview would outlive this script and keep
// holding its port. detached puts astro at the head of its own process group so cleanup can
// sweep the whole tree.
const ASTRO = new URL('../node_modules/.bin/astro', import.meta.url).pathname;

/** Is something already listening on the port? A successful connect says yes. */
function portInUse() {
  return new Promise((resolve) => {
    const socket = connect({ host: HOST, port: PORT });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Serve the built site on a fixed host and port. The port is pinned rather than read back
 * from astro's stdout: that would couple the deploy to the exact wording of a log line
 * ("http://localhost:"), which is UI, not a contract. So the port is checked free first —
 * a busy port is a hard error, not a silent move to another one that would then render
 * whatever is squatting there — and readiness is an HTTP poll on the address we chose.
 */
async function startPreview() {
  if (await portInUse()) {
    throw new Error(`${HOST}:${PORT} is already in use — stop whatever is on it and retry.`);
  }

  const server = spawn(ASTRO, ['preview', '--host', HOST, '--port', String(PORT)], {
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`astro preview exited with code ${server.exitCode} before serving`);
    }
    try {
      const res = await fetch(`${ORIGIN}/${locales[0]}/resume`);
      if (res.ok) return server;
    } catch {
      // not listening yet
    }
    await sleep(200);
  }

  stop(server);
  throw new Error(`astro preview did not answer on ${ORIGIN} within 30s`);
}

/** Kill the whole process group, not just the leader — so nothing is left holding the port. */
function stop(server) {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // already gone
  }
}

// The browser launch is inside the try: it can fail (an incompatible or missing browser),
// and if it did before the try, the finally that stops the preview would not be in force —
// leaving the detached server holding the port, the very leak this script otherwise guards.
const server = await startPreview();
let browser;

try {
  browser = await chromium.launch();
  await mkdir(OUT_DIR, { recursive: true });

  for (const lang of locales) {
    const page = await browser.newPage();
    const url = `${ORIGIN}/${lang}/resume`;
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
  stop(server);
}

console.log(`\nPDF resume written to ${OUT_DIR}/ (${locales.join(', ')})\n`);
