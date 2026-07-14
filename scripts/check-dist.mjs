// Smoke check: the build succeeded, but did it actually produce a site?
// Guards against deploying an empty or half-built dist/.
//
// Project detail pages are derived from the content rather than listed here, so a new
// project is covered the day it is added.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { locales } from '../src/i18n/config.ts';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PROJECTS = new URL('../src/content/projects/', import.meta.url).pathname;

const ROUTES = ['', 'resume', 'projects', 'contacts'];

const expected = ['index.html', '404.html', 'sitemap-index.xml', 'robots.txt'];

for (const lang of locales) {
  for (const route of ROUTES) {
    expected.push(join(lang, route, 'index.html'));
  }

  // The share cards come out of the og-[lang].jpg endpoint during the build, so they
  // are worth asserting: a missing card means every shared link loses its preview.
  expected.push(`og-${lang}.jpg`);

  const slugs = readdirSync(join(PROJECTS, lang))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  for (const slug of slugs) {
    expected.push(join(lang, 'projects', slug, 'index.html'));
  }
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

if (errors.length > 0) {
  console.error('dist/ smoke check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`dist/ smoke check OK (${expected.length} files, assets present)`);
