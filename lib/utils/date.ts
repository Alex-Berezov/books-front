import { getLocaleTag } from '@/lib/i18n/lang';
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

/**
 * Дата днём, месяцем словом и годом по правилам языка, в UTC: иначе на западе от Гринвича
 * полночь даты уезжает на предыдущий день.
 */
export const formatLongDateUtc = (date: Date, lang: string): string =>
  new Intl.DateTimeFormat(getLocaleTag(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
