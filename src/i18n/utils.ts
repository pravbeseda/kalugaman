import type { Locale } from './config';
import en from './en';
import ru from './ru';

const dictionaries = { en, ru } as const;
type Key = keyof typeof en;

/** Типизированный перевод UI-строки: t('ru', 'nav.home') */
export function useTranslations(lang: Locale) {
  return function t(key: Key): string {
    return dictionaries[lang][key];
  };
}

/** Путь другой локали для того же pathname: /en/projects → /ru/projects */
export function switchLocalePath(pathname: string, to: Locale): string {
  return pathname.replace(/^\/(en|ru)(?=\/|$)/, `/${to}`);
}
