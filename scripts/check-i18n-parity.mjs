// Language parity: every document must exist in both en/ and ru/ with the same slug.
// A missing translation means LangSwitch links to a 404, so this fails the build.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONTENT = new URL('../src/content/', import.meta.url).pathname;
const PAIRED = ['projects', 'pages'];
const errors = [];

const slugs = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

for (const collection of PAIRED) {
  const en = new Set(slugs(join(CONTENT, collection, 'en')));
  const ru = new Set(slugs(join(CONTENT, collection, 'ru')));

  for (const slug of en) {
    if (!ru.has(slug)) errors.push(`${collection}: missing ru/${slug}.md (en/${slug}.md exists)`);
  }
  for (const slug of ru) {
    if (!en.has(slug)) errors.push(`${collection}: missing en/${slug}.md (ru/${slug}.md exists)`);
  }
}

for (const lang of ['en', 'ru']) {
  if (!existsSync(join(CONTENT, 'resume', `${lang}.md`))) {
    errors.push(`resume: missing ${lang}.md`);
  }
}

if (errors.length > 0) {
  console.error('Language parity check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('Language parity OK');
