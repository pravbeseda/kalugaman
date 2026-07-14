// Every scraper (Facebook, LinkedIn, and Telegram in particular) caches og:image by
// URL, for a long time. The card is redrawn from the resume on every build, so without
// a version in the URL a new card would never reach anyone who had already shared the
// site. The version is a hash of the very bytes the endpoint serves: the URL changes
// exactly when the image does, and not one build sooner.

import { createHash } from 'node:crypto';
import type { Locale } from '../i18n/config';
import { ogCard } from './og-card';

export async function ogImageUrl(lang: Locale, site: URL): Promise<string> {
  const card = await ogCard(lang);
  const hash = createHash('sha256').update(card).digest('hex').slice(0, 8);

  const url = new URL(`/og-${lang}.jpg`, site);
  url.searchParams.set('v', hash);
  return url.href;
}
