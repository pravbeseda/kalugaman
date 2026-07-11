// @ts-check
import { defineConfig } from 'astro/config';

// POC: чистый SSG. i18n сделан вручную через [lang]-роутинг
// (см. src/pages/[lang]/...), чтобы поведение было явным и читаемым.
export default defineConfig({
  site: 'https://kalugaman.ru',
  trailingSlash: 'ignore',
});
