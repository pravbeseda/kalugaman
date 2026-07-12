// Smoke check: the build succeeded, but did it actually produce a site?
// Guards against deploying an empty or half-built dist/.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

const REQUIRED_FILES = [
  'index.html',
  'en/index.html',
  'en/resume/index.html',
  'en/projects/index.html',
  'en/contacts/index.html',
  'ru/index.html',
  'ru/resume/index.html',
  'ru/projects/index.html',
  'ru/contacts/index.html',
  'sitemap-index.xml',
];

const errors = [];

for (const file of REQUIRED_FILES) {
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

console.log(`dist/ smoke check OK (${REQUIRED_FILES.length} pages, assets present)`);
