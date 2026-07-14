// /og-en.jpg, /og-ru.jpg — the share cards, drawn from the resume at build time.
import type { APIRoute } from 'astro';
import { locales, type Locale } from '../i18n/config';
import { ogCard } from '../lib/og-card';

export function getStaticPaths() {
  return locales.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = async ({ params }) => {
  const card = await ogCard(params.lang as Locale);

  return new Response(new Uint8Array(card), {
    headers: { 'Content-Type': 'image/jpeg' },
  });
};
