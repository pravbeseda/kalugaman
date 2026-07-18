// End-to-end smoke tests: drive the built site in a real browser and assert the few things
// that have actual behaviour behind them — every page renders, the theme toggle flips and
// sticks (including across a ClientRouter navigation), and the language switch lands on the
// same page in the other locale. Everything else on the site is static HTML the build check
// already vouches for; these cover the client scripts, which nothing else exercises.
//
// Needs a build first and a browser: `npm run build && npm run test:e2e`. Run on deploy,
// where dist/ and Chromium already exist for the PDF — not on a PR, which has no browser.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { locales } from '../src/i18n/config.ts';
import { startPreview, stopPreview } from '../scripts/lib/preview.mjs';

// A different port from the PDF script's, so the two can never collide if both are running.
const PORT = 4326;
const ROUTES = ['', 'resume', 'projects', 'contacts'];

let server;
let origin;
let browser;

before(async () => {
  ({ server, origin } = await startPreview({ port: PORT, readyPath: `/${locales[0]}/` }));
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  stopPreview(server);
});

const themeOf = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

test('every page renders in both languages', async () => {
  const page = await browser.newPage();
  try {
    for (const lang of locales) {
      for (const route of ROUTES) {
        const url = `${origin}/${lang}/${route}`;
        const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
        assert.ok(res?.ok(), `${url} answered ${res?.status()}`);

        const htmlLang = await page.getAttribute('html', 'lang');
        assert.equal(htmlLang, lang, `${url}: <html lang> is "${htmlLang}", expected "${lang}"`);

        const main = await page.locator('main#main').innerText();
        assert.ok(main.trim().length > 0, `${url}: <main> is empty`);

        const title = await page.title();
        assert.ok(title.trim().length > 0, `${url}: empty <title>`);
      }
    }
  } finally {
    await page.close();
  }
});

test('theme toggle flips the theme and persists across a reload', async () => {
  // colorScheme pinned so the starting point is deterministic: with no stored choice the
  // toggle offers the opposite of the system preference, and light → a click means dark.
  const context = await browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/${locales[0]}/`, { waitUntil: 'domcontentloaded' });

    // The button reveals itself only once its own script has run (data-theme-ready); a visible
    // toggle is therefore also the proof that the script wiring the click is in force.
    const toggle = page.locator('#theme-toggle');
    await toggle.waitFor({ state: 'visible' });

    assert.equal(await themeOf(page), null, 'no theme should be pinned before the first click');

    await toggle.click();
    assert.equal(await themeOf(page), 'dark', 'a click from light should select dark');
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    assert.equal(stored, 'dark', 'the choice should be written to localStorage');

    // The inline head script re-applies the stored theme before first paint, so a full reload
    // must come back dark rather than flashing to the system light.
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await themeOf(page), 'dark', 'the theme should survive a reload');
  } finally {
    await context.close();
  }
});

test('theme survives a client-side navigation', async () => {
  const context = await browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/${locales[0]}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#theme-toggle').waitFor({ state: 'visible' });
    await page.locator('#theme-toggle').click();
    assert.equal(await themeOf(page), 'dark');

    // An in-page click on a nav link is a ClientRouter swap, not a reload — the after-swap
    // handler must carry the theme over before the new document paints.
    await page.locator(`.nav a[href="/${locales[0]}/projects"]`).click();
    await page.waitForURL(`${origin}/${locales[0]}/projects`);
    assert.equal(await themeOf(page), 'dark', 'the theme should survive a client-side navigation');
  } finally {
    await context.close();
  }
});

test('the language switch goes to the same page in the other locale', async () => {
  const page = await browser.newPage();
  try {
    // Both directions: /en/<page> ⇄ /ru/<page>, staying on the same route.
    for (const [from, to] of [
      ['en', 'ru'],
      ['ru', 'en'],
    ]) {
      await page.goto(`${origin}/${from}/projects/`, { waitUntil: 'domcontentloaded' });
      // The switch's href is derived from the page's own pathname, so it carries the trailing
      // slash the build emits — unlike the nav links, which are written out without one.
      await page.locator('.lang-switch').click();
      await page.waitForURL(`${origin}/${to}/projects/`);
      assert.equal(await page.getAttribute('html', 'lang'), to);
    }
  } finally {
    await page.close();
  }
});

test('a project reached from the résumé offers its way back — across a language switch', async () => {
  const [first, second] = locales;
  // Same project both ways; the resume links to it and the back-link script keys off the query.
  const atProject = (lang) => (url) =>
    url.pathname.replace(/\/$/, '') === `/${lang}/projects/intermedia-unite` &&
    url.searchParams.get('from') === 'resume';
  const backPointsTo = (expected) =>
    document.querySelector('a.back')?.getAttribute('href') === expected;

  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/${first}/resume/`, { waitUntil: 'domcontentloaded' });

    // Following the resume's "more about the project" link is what tags the visit with
    // ?from=resume — the whole mechanism hangs off that query.
    await page.locator('.job__more a').first().click();
    await page.waitForURL(atProject(first));

    // The back-link script (astro:page-load) swaps "back to projects" for "back to resume".
    await page.waitForFunction(backPointsTo, `/${first}/resume`);

    // Switching language must carry the from=resume context, so the other locale still offers
    // the resume back link instead of resetting to the projects list.
    await page.locator('.lang-switch').click();
    await page.waitForURL(atProject(second));
    assert.equal(await page.getAttribute('html', 'lang'), second);
    await page.waitForFunction(backPointsTo, `/${second}/resume`);
  } finally {
    await page.close();
  }
});
