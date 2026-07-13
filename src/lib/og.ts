// The share card lives at a fixed path, and every scraper (Facebook, LinkedIn, and
// Telegram in particular) caches og:image by URL for a long time. A card redrawn from
// a changed resume would therefore never reach anyone who had already shared the site.
// Hashing the bytes that are actually served means the URL changes exactly when the
// image does, and not one build sooner.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locale } from '../i18n/config';

const hashes = new Map<Locale, string>();

function fingerprint(lang: Locale): string | null {
  if (!hashes.has(lang)) {
    try {
      // The layout is bundled into a chunk, so import.meta.url says nothing about the
      // source tree. astro build always runs from the project root.
      const file = join(process.cwd(), 'public', `og-${lang}.jpg`);
      const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
      hashes.set(lang, hash);
    } catch {
      // `npm run dev` skips the prebuild that draws the cards. The meta tag is not
      // what dev is for, so serve it unversioned rather than fail the page.
      return null;
    }
  }
  return hashes.get(lang) ?? null;
}

export function ogImageUrl(lang: Locale, site: URL): string {
  const url = new URL(`/og-${lang}.jpg`, site);
  const hash = fingerprint(lang);
  if (hash) url.searchParams.set('v', hash);
  return url.href;
}
