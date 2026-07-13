export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** Open Graph wants a territory-qualified tag (en_US), not a bare language. */
export const ogLocales: Record<Locale, string> = { en: 'en_US', ru: 'ru_RU' };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
