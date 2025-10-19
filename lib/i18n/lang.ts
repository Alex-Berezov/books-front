export const SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function isSupportedLang(lang: string): lang is SupportedLang {
  return SUPPORTED_LANGS.includes(lang as SupportedLang);
}

export function getDefaultLang(): SupportedLang {
  return (process.env.NEXT_PUBLIC_DEFAULT_LANG as SupportedLang) || 'en';
}
