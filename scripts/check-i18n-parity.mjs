// Language parity: every document must exist in both en/ and ru/ with the same slug.
// A missing translation means LangSwitch links to a 404, so this fails the build.
//
// Collections are discovered from the filesystem rather than listed here, so a new
// collection is checked from the day it appears. Two shapes are supported:
//   projects/{en,ru}/<slug>.md   — slug sets must match
//   resume/{en,ru}.md            — both files must exist
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { locales } from '../src/i18n/config.ts';

const CONTENT = new URL('../src/content/', import.meta.url).pathname;
const errors = [];

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
    for (const lang of locales) {
      if (!existsSync(join(CONTENT, collection, `${lang}.md`))) {
        errors.push(`${collection}: missing ${lang}.md`);
      }
    }
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
