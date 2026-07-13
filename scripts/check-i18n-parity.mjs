// Language parity: every document must exist in both en/ and ru/ with the same slug.
// A missing translation means LangSwitch links to a 404, so this fails the build.
//
// Collections are discovered from the filesystem rather than listed here, so a new
// collection is checked from the day it appears. Two shapes are supported:
//   projects/{en,ru}/<slug>.md   — slug sets must match
//   resume/{en,ru}.md            — both files must exist
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { locales } from '../src/i18n/config.ts';

const CONTENT = new URL('../src/content/', import.meta.url).pathname;
const errors = [];

/**
 * Which experience entry carries `current: true` (-1 if none). The flag drives
 * `worksFor` in the JSON-LD, and it lives in every locale's resume — set it in one
 * language only and that language alone would claim an employer. The schema checks
 * each file on its own; only parity can see the two disagree.
 */
const currentJobIndex = (file) =>
  readFileSync(file, 'utf8')
    .split(/^ {2}- company:/m)
    .slice(1)
    .findIndex((job) => /^ {4}current:\s*true\s*$/m.test(job));

function checkCurrentJobParity(collection) {
  const perLocale = locales.map((lang) => ({
    lang,
    index: currentJobIndex(join(CONTENT, collection, `${lang}.md`)),
  }));

  const [first, ...rest] = perLocale;
  if (rest.some((other) => other.index !== first.index)) {
    const shown = perLocale
      .map(({ lang, index }) => `${lang}: ${index === -1 ? 'none' : `job #${index + 1}`}`)
      .join(', ');
    errors.push(`${collection}: \`current\` is not on the same job in every language (${shown})`);
  }
}

// A missing directory is a parity failure, not a crash — it is the most likely way
// parity breaks in the first place (a collection added in one language only).
const slugs = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
    : null;

const collections = readdirSync(CONTENT).filter((name) =>
  statSync(join(CONTENT, name)).isDirectory(),
);

for (const collection of collections) {
  const perLocale = new Map(locales.map((lang) => [lang, slugs(join(CONTENT, collection, lang))]));

  // resume/{en,ru}.md — no language subdirectories, documents are the locale files.
  if ([...perLocale.values()].every((s) => s === null)) {
    const missing = locales.filter((lang) => !existsSync(join(CONTENT, collection, `${lang}.md`)));
    for (const lang of missing) {
      errors.push(`${collection}: missing ${lang}.md`);
    }
    if (missing.length === 0) checkCurrentJobParity(collection);
    continue;
  }

  for (const lang of locales) {
    if (perLocale.get(lang) === null) {
      errors.push(`${collection}: missing the whole ${lang}/ directory`);
    }
  }

  const known = new Set([...perLocale.values()].filter((s) => s !== null).flatMap((s) => s));

  for (const slug of known) {
    for (const lang of locales) {
      const present = perLocale.get(lang);
      if (present && !present.includes(slug)) {
        errors.push(`${collection}: missing ${lang}/${slug}.md`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Language parity check failed:');
  for (const e of errors.sort()) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `Language parity OK (${collections.length} collections, locales: ${locales.join(', ')})`,
);
