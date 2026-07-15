// Serve the built site with `astro preview` for a Playwright run (PDF generation, e2e) and
// tear the whole process tree down after. Shared so the subtle parts — pinning the port and
// killing the process group — live in one place rather than in two copies that can drift.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';

// The astro binary directly, not `npx astro`: npx spawns astro as a child, and a signal to
// npx is not guaranteed to reach that child — a preview would outlive the caller and keep
// holding its port. detached puts astro at the head of its own process group so cleanup can
// sweep the whole tree.
const ASTRO = new URL('../../node_modules/.bin/astro', import.meta.url).pathname;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Is something already listening on the port? A successful connect says yes. */
function portInUse(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

/**
 * Serve the built site on a fixed host and port, resolving to `{ server, origin }` once it
 * answers. The port is pinned rather than read back from astro's stdout: that would couple
 * the caller to the exact wording of a log line ("http://localhost:"), which is UI, not a
 * contract. So the port is checked free first — a busy port is a hard error, not a silent
 * move to another one that would then serve whatever is squatting there — and readiness is
 * an HTTP poll on the address we chose. `readyPath` is the URL polled for a 200.
 */
export async function startPreview({ host = '127.0.0.1', port = 4325, readyPath = '/' } = {}) {
  const origin = `http://${host}:${port}`;

  if (await portInUse(host, port)) {
    throw new Error(`${host}:${port} is already in use — stop whatever is on it and retry.`);
  }

  const server = spawn(ASTRO, ['preview', '--host', host, '--port', String(port)], {
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`astro preview exited with code ${server.exitCode} before serving`);
    }
    try {
      const res = await fetch(`${origin}${readyPath}`);
      if (res.ok) return { server, origin };
    } catch {
      // not listening yet
    }
    await sleep(200);
  }

  stopPreview(server);
  throw new Error(`astro preview did not answer on ${origin} within 30s`);
}

/** Kill the whole process group, not just the leader — so nothing is left holding the port. */
export function stopPreview(server) {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // already gone
  }
}
