import type { SupportedLang } from '@/lib/i18n/lang';

export const formatDate = (dateString: string, locale: SupportedLang = 'en'): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};
