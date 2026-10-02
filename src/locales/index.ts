import { AppLocale } from './types';
import { enLocale } from './en';
import { soLocale } from './so';
import { amLocale } from './am';

export type SupportedLanguage = 'en' | 'so' | 'am';

export const LOCALES: Record<SupportedLanguage, AppLocale> = {
  en: enLocale,
  so: soLocale,
  am: amLocale,
};

export function getLocale(lang: SupportedLanguage = 'en'): AppLocale {
  return LOCALES[lang] || enLocale;
}

export * from './types';
