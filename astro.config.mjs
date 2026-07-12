// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// Static SSG. i18n is handled manually via [lang] routing (src/pages/[lang]/...).
export default defineConfig({
  site: 'https://kalugaman.ru',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      // links en/ru page versions via hreflang in the sitemap
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
      // root `/` is a server redirect (noindex) — keep it out of the sitemap
      filter: (page) => page !== 'https://kalugaman.ru/',
    }),
  ],
});
