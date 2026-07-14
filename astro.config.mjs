// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// Static SSG. i18n is handled manually via [lang] routing (src/pages/[lang]/...).
export default defineConfig({
  site: 'https://kalugaman.ru',
  trailingSlash: 'ignore',
  // Self-hosted, cut to Latin + Cyrillic (scripts/subset-fonts.sh) — ~35 KB a weight.
  // Astro hashes the files, preloads them and derives a metric-matched system fallback,
  // so the swap does not shift the layout.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      options: {
        variants: [
          { weight: 400, style: 'normal', src: ['./src/assets/fonts/Inter-Regular.woff2'] },
          { weight: 600, style: 'normal', src: ['./src/assets/fonts/Inter-SemiBold.woff2'] },
          { weight: 700, style: 'normal', src: ['./src/assets/fonts/Inter-Bold.woff2'] },
        ],
      },
    },
  ],
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
