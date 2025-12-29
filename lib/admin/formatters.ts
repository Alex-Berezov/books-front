import { formatDate as formatBaseDate } from '@/lib/utils/date';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Format date for admin interface
 */
export const formatDate = (
  date: string | Date | undefined | null,
  lang: SupportedLang = 'en'
): string => {
  if (!date) return '-';
  const dateStr = date instanceof Date ? date.toISOString() : date;
  return formatBaseDate(dateStr, lang);
};

/**
 * Format date with time
 */
export const formatDateTime = (
  date: string | Date | undefined | null,
  lang: SupportedLang = 'en'
): string => {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);

  return new Intl.DateTimeFormat(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

/**
 * Format file size (bytes to KB/MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format status string (capitalize first letter)
 */
export const formatStatus = (status: string): string => {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};
